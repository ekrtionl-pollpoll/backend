import { Request, Response, NextFunction } from "express";
import { generateAccessToken, generateRefreshToken } from "../utils/auth.utils";
import catchError from "../utils/catchError";
import {
  createUser,
  refreshUserAccessToken,
  signInUser,
  verifyEmailService,
  sendPasswordResetEmail,
  resetPasswordService,
} from "../services/auth.service";
import { CREATED, OK, UNAUTHORIZED, CONFLICT } from "../constants/http";
import {
  clearAuthCookies,
  getAccessTokenCookieOptions,
  getRefreshTokenCookieOptions,
  setAuthCookies,
} from "../utils/cookies";
import { verifyToken } from "../utils/jwt";
import { deleteSession } from "../services/session.service";
import appAssert from "../utils/appAssert";
import { isEmailTaken, isUsernameTaken } from "../utils/user.utils";
import {
  signUpSchema,
  signInSchema,
  verificationCodeSchema,
  emailSchema,
  resetPasswordSchema,
} from "../models/auth.schema";

interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
  };
}

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

      req.session.userId = user.id;
      req.session.email = user.email;
      req.session.username = user.username;

      const accessToken = generateAccessToken(user.id, sessionId);
      const refreshToken = generateRefreshToken(user.id, sessionId);

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

      const { accessToken, newRefreshToken } =
        await refreshUserAccessToken(refreshToken);

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

export const checkEmailDuplicate = catchError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email } = req.body;

      const emailExists = await isEmailTaken(email);

      appAssert(!emailExists, CONFLICT, "이메일이 이미 존재합니다.");

      res.status(OK).json({
        success: true,
        message: "사용 가능한 이메일입니다.",
      });
    } catch (error) {
      next(error);
    }
  }
);

export const checkUsernameDuplicate = catchError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { username } = req.body;

      const usernameExists = await isUsernameTaken(username);

      appAssert(!usernameExists, CONFLICT, "이름이 이미 존재합니다.");

      res.status(OK).json({
        success: true,
        message: "사용 가능한 이름입니다.",
      });
    } catch (error) {
      next(error);
    }
  }
);

export const verifyEmail = catchError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const verificationCode = verificationCodeSchema.parse(req.params.code);

      await verifyEmailService(verificationCode);

      res.status(OK).json({
        success: true,
        message: "이메일 인증이 완료되었습니다.",
      });
    } catch (error) {
      next(error);
    }
  }
);

export const forgotPassword = catchError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const email = emailSchema.parse(req.body.email);

      await sendPasswordResetEmail(email);

      res.status(OK).json({
        success: true,
        message: "비밀번호 초기화 이메일을 보냈습니다.",
      });
    } catch (error) {
      next(error);
    }
  }
);

export const resetPassword = catchError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const request = resetPasswordSchema.parse(req.body);

      await resetPasswordService(request);

      clearAuthCookies(res);

      res.status(OK).json({
        success: true,
        message: "비밀번호가 초기화되었습니다.",
      });
    } catch (error) {
      next(error);
    }
  }
);
