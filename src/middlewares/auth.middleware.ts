import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config/env";
import { isTokenBlacklisted } from "../utils/token";
import { pool } from "../config/database";
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

export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const client = await pool.connect();
  const accessToken = req.cookies.accessToken;

  if (!accessToken) {
    res.status(401).json({
      success: false,
      message: "인증 토큰이 필요합니다.",
    });
    return;
  }

  try {
    const isBlacklisted = await isTokenBlacklisted(accessToken);
    if (isBlacklisted) {
      res.status(401).json({
        success: false,
        message: "만료된 세션입니다. 다시 로그인해주세요.",
      });
      return;
    }

    const decoded = jwt.verify(accessToken, JWT_SECRET || "secret") as {
      userId: string;
    };

    const user = await client.query(`SELECT * FROM users WHERE id = $1`, [
      decoded.userId,
    ]);

    if (!user.rows[0]) {
      res.status(401).json({
        success: false,
        message: "유효하지 않은 토큰입니다.",
      });
      return;
    }
    // password를 제외한 사용자 정보만 전달
    const { password, ...userWithoutPassword } = user.rows[0];
    console.log(userWithoutPassword);
    (req as AuthenticatedRequest).user = userWithoutPassword;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: "유효하지 않은 토큰입니다.",
    });
    return;
  } finally {
    client.release();
  }
};
