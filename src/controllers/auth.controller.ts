import { Request, Response, NextFunction } from "express";
import { pool } from "../config/database";
import jwt from "jsonwebtoken";
import { JWT_SECRET, JWT_REFRESH_SECRET } from "../constants/env";
import {
  generateAccessToken,
  verifyRefreshToken,
  blacklistToken,
  generateCsrfToken,
  generateRefreshToken,
} from "../utils/auth.utils";
import redisClient from "../config/redis";
import catchError from "../utils/catchError";
import {
  createUser,
  refreshUserAccessToken,
  signInUser,
} from "../services/auth.service";
import { CREATED, OK, UNAUTHORIZED } from "../constants/http";
import {
  clearAuthCookies,
  getAccessTokenCookieOptions,
  getRefreshTokenCookieOptions,
  setAuthCookies,
} from "../utils/cookies";
import { z } from "zod";
import { verifyToken } from "../utils/jwt";
import { deleteSession } from "../services/session.service";
import appAssert from "../utils/appAssert";
interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
  };
}

const signUpSchema = z
  .object({
    email: z.string().email(),
    username: z.string().min(3).max(12),
    password: z.string().min(8).max(255),
    confirmPassword: z.string().min(8).max(255),
    userAgent: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "비밀번호가 일치하지 않습니다.",
  });

const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(255),
  userAgent: z.string().optional(),
});

export const signUp = catchError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const request = signUpSchema.parse({
        ...req.body,
        userAgent: req.headers["user-agent"],
      });

      const user = await createUser(request);

      res.status(CREATED).json({
        success: true,
        message: "회원가입이 완료되었습니다. 로그인해주세요.",
        user,
      });
    } catch (error) {
      next(error);
    }
  }
);

export const signIn = catchError(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const request = signInSchema.parse({
        ...req.body,
        userAgent: req.headers["user-agent"],
      });

      if (!req.session) {
        throw new Error("세션 초기화에 실패했습니다.");
      }
      const { user, sessionId } = await signInUser(request);
      // 세션에 사용자 정보 저장
      req.session.userId = user.id;
      req.session.email = user.email;
      req.session.username = user.username;

      const accessToken = generateAccessToken(user.id, sessionId);
      const refreshToken = generateRefreshToken(user.id, sessionId);

      // const csrfToken = await generateCsrfToken();

      setAuthCookies({ res, accessToken, refreshToken });
      res.status(OK).json({
        success: true,
        message: "로그인이 완료되었습니다.",
        user,
      });
    } catch (error) {
      next(error);
    }
  }
);

export const signOut = catchError(
  async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const accessToken = req.cookies.accessToken;
      const { payload } = verifyToken(accessToken);

      if (payload) {
        await deleteSession(payload.sessionId);
      }

      // 쿠키 삭제
      clearAuthCookies(res);

      res.status(OK).json({ success: true, message: "로그아웃 되었습니다" });
    } catch (error) {
      console.error("Logout error:", error);
      res.status(500).json({ message: "로그아웃 중 오류가 발생했습니다" });
      next(error);
    }
  }
);

export const refreshToken = catchError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const refreshToken = req.cookies.refreshToken as string | undefined;

      appAssert(refreshToken, UNAUTHORIZED, "리프레시 토큰이 필요합니다.");

      const { accessToken, newRefreshToken } = await refreshUserAccessToken(
        refreshToken
      );

      if (newRefreshToken) {
        res.cookie(
          "refreshToken",
          newRefreshToken,
          getRefreshTokenCookieOptions()
        );
      }

      res
        .status(OK)
        .cookie("accessToken", accessToken, getAccessTokenCookieOptions())
        .json({
          success: true,
          message: "액세스 토큰이 갱신되었습니다.",
        });
    } catch (error) {
      next(error);
    }
  }
);
