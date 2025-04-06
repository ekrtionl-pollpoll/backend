import { Request, Response, NextFunction, RequestHandler } from "express";
import { UNAUTHORIZED } from "../constants/http";
import appAssert from "../utils/appAssert";
import AppErrorCode from "../constants/appErrorCode";
import { verifyToken } from "../utils/jwt";
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    username: string;
    profile_image?: string | null;
    bio?: string | null;
    is_active: boolean;
    last_login?: Date | null;
  };
}

export const authenticate: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const accessToken = req.cookies.accessToken as string | undefined;

    appAssert(
      accessToken,
      UNAUTHORIZED,
      "인증 토큰이 필요합니다.",
      AppErrorCode.InvalidAccessToken
    );

    const { error, payload } = verifyToken(accessToken);

    appAssert(
      payload,
      UNAUTHORIZED,
      error === "jwt expired"
        ? "만료된 토큰입니다."
        : "유효하지 않은 토큰입니다.",
      AppErrorCode.InvalidAccessToken
    );

    req.userId = payload.userId;
    req.sessionId = payload.sessionId;

    next();
  } catch (err) {
    next(err);
  }
};
