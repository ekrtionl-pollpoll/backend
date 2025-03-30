import { Request, Response, NextFunction } from "express";
import { pool } from "../config/database";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User, CreateUser } from "../models/user";
import { JWT_SECRET, JWT_REFRESH_SECRET } from "../config/env";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  blacklistToken,
  generateCsrfToken,
} from "../utils/token";
import redisClient from "../config/redis";
import { v4 as uuidv4 } from "uuid";
import { isEmailTaken, isUsernameTaken } from "../utils/user.utils";

interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
  };
}

export const signUp = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const client = await pool.connect();
  try {
    const { email, password, username }: CreateUser = req.body;

    // 이메일과 유저네임 중복 체크
    const [emailExists, usernameExists] = await Promise.all([
      isEmailTaken(email),
      isUsernameTaken(username),
    ]);

    if (emailExists) {
      res.status(400).json({
        success: false,
        message: "이미 존재하는 이메일입니다.",
      });
      return;
    }

    if (usernameExists) {
      res.status(400).json({
        success: false,
        message: "이미 존재하는 유저네임입니다.",
      });
      return;
    }

    // 비밀번호 해시화
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 트랜잭션 시작
    await client.query("BEGIN");

    // 사용자 생성
    const id = uuidv4();
    const result = await client.query(
      `INSERT INTO users (id, email, password, username, profile_image, bio, is_active, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, null, null, true, NOW(), NOW()) 
       RETURNING id, email, username, profile_image, bio, is_active, created_at, updated_at`,
      [id, email, hashedPassword, username]
    );

    await client.query("COMMIT");

    // password를 제외한 사용자 정보만 전달
    const { password: _, ...userWithoutPassword } = result.rows[0];

    res.status(201).json({
      success: true,
      message: "회원가입이 완료되었습니다. 로그인해주세요.",
      data: {
        user: userWithoutPassword,
      },
    });
  } catch (error) {
    await client.query("ROLLBACK");
    next(error);
  } finally {
    client.release();
  }
};

export const signIn = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const client = await pool.connect();
  try {
    const { email, password } = req.body;

    // 사용자 조회
    const result = await client.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);

    if (result.rows.length === 0) {
      res.status(401).json({
        success: false,
        message: "이메일 또는 비밀번호가 일치하지 않습니다.",
      });
      return;
    }

    const user: User = result.rows[0];

    // 비밀번호 확인
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.status(401).json({
        success: false,
        message: "이메일 또는 비밀번호가 일치하지 않습니다.",
      });
      return;
    }

    // 마지막 로그인 시간 업데이트
    await client.query("UPDATE users SET last_login = NOW() WHERE id = $1", [
      user.id,
    ]);

    // 토큰 생성
    const accessToken = generateAccessToken(user.id.toString());
    const refreshToken = generateRefreshToken(user.id.toString());

    // 쿠키 설정
    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 15 * 60 * 1000, // 15분
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7일
    });

    const csrfToken = await generateCsrfToken();
    console.log(csrfToken);

    res.status(200).json({
      success: true,
      message: "로그인이 완료되었습니다.",
      data: {
        user: {
          userId: user.id,
          email: user.email,
          username: user.username,
          profile_image: user.profile_image,
          bio: user.bio,
          is_active: user.is_active,
          last_login: user.last_login,
        },
        csrfToken,
      },
    });
  } catch (error) {
    next(error);
  } finally {
    client.release();
  }
};

export const signOut = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const accessToken = req.cookies.accessToken;
    const refreshToken = req.cookies.refreshToken;

    // 액세스 토큰 블랙리스트에 추가
    if (accessToken) {
      await blacklistToken(accessToken);
    }

    // 리프레시 토큰 삭제
    if (refreshToken && req.user) {
      await redisClient.del(`refresh_${req.user.userId}`);
    }

    // 쿠키 삭제
    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");
    res.clearCookie("XSRF-TOKEN");

    res.json({ success: true, message: "로그아웃 되었습니다" });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({ message: "로그아웃 중 오류가 발생했습니다" });
    next(error);
  }
};

export const refreshToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const client = await pool.connect();

  try {
    console.log("Cookies:", req.cookies);
    const refreshToken = req.cookies.refreshToken;
    console.log("Refresh Token:", refreshToken);

    if (!refreshToken) {
      res.status(401).json({
        success: false,
        message: "리프레시 토큰이 필요합니다.",
      });
      return;
    }

    const decoded = jwt.verify(
      refreshToken,
      JWT_REFRESH_SECRET || "secret"
    ) as { userId: string };
    const userId = decoded.userId;

    const isTokenValid = await verifyRefreshToken(userId, refreshToken);

    if (!isTokenValid) {
      res.status(401).json({
        success: false,
        message: "유효하지 않은 리프레시 토큰입니다.",
      });
      return;
    }

    const user = await client.query("SELECT * FROM users WHERE id = $1", [
      userId,
    ]);

    if (user.rows.length === 0) {
      res.status(401).json({
        success: false,
        message: "사용자를 찾을 수 없습니다.",
      });
      return;
    }

    // 새 액세스 토큰 발급
    const newAccessToken = generateAccessToken(userId);

    // 쿠키 설정
    res.cookie("accessToken", newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 15 * 60 * 1000, // 15분
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7일
    });

    res.status(200).json({
      success: true,
      message: "토큰이 갱신되었습니다.",
      data: {
        user: user.rows[0],
      },
    });
  } catch (error: any) {
    if (error.name === "TokenExpiredError") {
      res.status(401).json({ message: "리프레시 토큰이 만료되었습니다" });
    }

    console.error("Token refresh error:", error);
    res.status(403).json({ message: "토큰 갱신 중 오류가 발생했습니다" });
    next(error);
  } finally {
    client.release();
  }
};
