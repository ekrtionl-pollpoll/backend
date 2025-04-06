import { Request, Response, NextFunction } from "express";
import { pool } from "../config/database";
import { isUsernameTaken } from "../utils/user.utils";
import catchError from "../utils/catchError";
import appAssert from "../utils/appAssert";
import { NOT_FOUND, CONFLICT, OK } from "../constants/http";
interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    username: string;
  };
}

export const getUsers = catchError(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const client = await pool.connect();
    try {
      const users =
        await client.query(`SELECT id, username, email, profile_image, bio, last_login, is_active, created_at, updated_at 
   FROM users`);

      res.status(200).json(users.rows);
    } catch (error) {
      console.error("Error fetching user:", error);
      next(error);
    } finally {
      client.release();
    }
  }
);

export const getUser = catchError(
  async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const client = await pool.connect();
    try {
      const user = await client.query(
        `SELECT id, username, email, profile_image, bio, last_login, is_active, created_at, updated_at 
   FROM users 
   WHERE id = $1`,
        [req.userId]
      );

      appAssert(user.rows.length > 0, NOT_FOUND, "사용자를 찾을 수 없습니다.");

      res.status(200).json({
        success: true,
        message: "사용자 정보를 조회했습니다.",
        user: user.rows[0],
      });
    } catch (error) {
      next(error);
    } finally {
      client.release();
    }
  }
);

export const updateUser = catchError(
  async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const client = await pool.connect();
    try {
      // 현재 사용자 정보 조회
      const currentUser = await client.query(
        `SELECT email FROM users WHERE id = $1`,
        [req.userId]
      );
      appAssert(
        currentUser.rows.length > 0,
        NOT_FOUND,
        "사용자를 찾을 수 없습니다."
      );

      const { username, profile_image, bio } = req.body;

      // 유저네임 중복 체크
      const usernameExists = await isUsernameTaken(username);
      appAssert(!usernameExists, CONFLICT, "이미 존재하는 유저네임입니다.");

      await client.query("BEGIN");

      const result = await client.query(
        `UPDATE users 
       SET username = $1, profile_image = $2, bio = $3, updated_at = NOW() 
       WHERE id = $4 
       RETURNING id, email, username, profile_image, bio, is_active, last_login, created_at, updated_at`,
        [username, profile_image, bio, req.userId]
      );

      await client.query("COMMIT");

      appAssert(
        result.rows.length > 0,
        NOT_FOUND,
        "사용자를 찾을 수 없습니다."
      );

      res.status(OK).json({
        success: true,
        message: "사용자 정보를 수정했습니다.",
        data: {
          user: result.rows[0],
        },
      });
    } catch (error) {
      await client.query("ROLLBACK");
      next(error);
    } finally {
      client.release();
    }
  }
);

export const deleteUser = catchError(
  async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const client = await pool.connect();
    try {
      const result = await client.query(`DELETE FROM users WHERE id = $1`, [
        req.userId,
      ]);

      appAssert(
        result.rowCount && result.rowCount > 0,
        NOT_FOUND,
        "사용자를 찾을 수 없습니다."
      );

      res.status(OK).json({
        success: true,
        message: "사용자 정보를 삭제했습니다.",
      });
    } catch (error) {
      next(error);
    } finally {
      client.release();
    }
  }
);
