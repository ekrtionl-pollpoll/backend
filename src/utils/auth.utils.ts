import jwt from "jsonwebtoken";
import { JWT_SECRET, JWT_REFRESH_SECRET } from "../constants/env";
import redisClient from "../config/redis";
import { Response } from "express";
import { CookieOptions } from "express-serve-static-core";
import { refreshTokenSignOptions, signToken } from "./jwt";

declare module "express-serve-static-core" {
  interface Response {
    clearCookie(name: string, options?: CookieOptions): Response;
  }
}

export const generateAccessToken = (userId: string, sessionId: string) => {
  const accessToken = signToken({ userId, sessionId });
  return accessToken;
};

export const generateRefreshToken = (userId: string, sessionId: string) => {
  const refreshToken = signToken(
    { userId, sessionId },
    refreshTokenSignOptions
  );

  return refreshToken;
};

export const blacklistToken = async (token: string) => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET || "secret") as {
      exp: number;
    };
    const exp = decoded.exp;
    const now = Math.floor(Date.now() / 1000);
    const ttl = exp - now; // 남은 만료 시간

    if (ttl > 0) {
      await redisClient.set(`bl_${token}`, "1", { EX: ttl });
    }

    return true;
  } catch (error) {
    console.error("Token blacklist error:", error);
    return false;
  }
};

// 토큰이 블랙리스트에 있는지 확인
export const isTokenBlacklisted = async (token: string) => {
  const result = await redisClient.get(`bl_${token}`);
  return result !== null;
};

// 리프레시 토큰 검증
export const verifyRefreshToken = async (userId: string, token: string) => {
  try {
    // Redis에 저장된 리프레시 토큰 가져오기
    const storedToken = await redisClient.get(`refresh_${userId}`);

    if (!storedToken || storedToken !== token) {
      return false;
    }

    // 토큰 검증
    jwt.verify(token, JWT_REFRESH_SECRET || "secret");
    return true;
  } catch (error) {
    console.error("Refresh token verification error:", error);
    return false;
  }
};

export const generateCsrfToken = async () => {
  const response = await fetch("http://localhost:5500/api/v1/csrf-token", {
    method: "GET",
    credentials: "include",
  });
  const data = await response.json();
  console.log("generated csrf token ", data);
  return data.csrfToken;
};

// 세션 설정 함수
export const setSessionData = ({
  req,
  userId,
  email,
  username,
  csrfToken,
}: {
  req: any;
  userId: string;
  email: string;
  username: string;
  csrfToken: string;
}): void => {
  if (req.session) {
    req.session.userId = userId;
    req.session.email = email;
    req.session.username = username;
    req.session.isAuthenticated = true;
    req.session.csrfToken = csrfToken;
  }
};

// 세션 및 쿠키 삭제 함수
export const clearAuthData = ({
  req,
  res,
}: {
  req: any;
  res: Response;
}): void => {
  // JWT 쿠키 삭제
  res.clearCookie("accessToken");
  res.clearCookie("refreshToken");

  // 세션 삭제
  req.session?.destroy();
  res.clearCookie("sid");
};
