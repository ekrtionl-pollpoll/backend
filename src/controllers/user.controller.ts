import { Request, Response, NextFunction } from "express";
import { pool } from "../config/database";
import { isEmailTaken, isUsernameTaken } from "../utils/user.utils";

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    username: string;
  };
}

export const getUsers = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
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
};

export const getUser = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const client = await pool.connect();
  try {
    if (!req.user?.id) {
      res.status(401).json({ error: "인증되지 않은 요청입니다." });
      return;
    }
    const user = await client.query(
      `SELECT id, username, email, profile_image, bio, last_login, is_active, created_at, updated_at 
   FROM users 
   WHERE id = $1`,
      [req.user.id]
    );
    if (!user) {
      res.status(404).json({ error: "사용자를 찾을 수 없습니다." });
      return;
    }
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
};

export const updateUser = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const client = await pool.connect();
  try {
    if (!req.user?.id) {
      res.status(401).json({ error: "인증되지 않은 요청입니다." });
      return;
    }
    // const { username, email, profile_image, bio } = req.body;
    const { username, email, profile_image, bio } = {
      ...req.user,
      ...req.body,
    };
    console.log(username, email, profile_image, bio);

    // 이메일과 유저네임 중복 체크 (현재 사용자의 이메일/유저네임이 아닌 경우에만)
    const [emailExists, usernameExists] = await Promise.all([
      email !== req.user.email ? isEmailTaken(email) : false,
      username !== req.user.username ? isUsernameTaken(username) : false,
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

    await client.query("BEGIN");

    const result = await client.query(
      `UPDATE users 
       SET username = $1, email = $2, profile_image = $3, bio = $4, updated_at = NOW() 
       WHERE id = $5 
       RETURNING id, email, username, profile_image, bio, is_active, last_login, created_at, updated_at`,
      [username, email, profile_image, bio, req.user.id]
    );

    await client.query("COMMIT");

    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: "사용자를 찾을 수 없습니다.",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "사용자 정보를 수정했습니다.",
      data: {
        user: result.rows[0],
      },
    });
  } catch (error) {
    next(error);
  } finally {
    client.release();
  }
};

export const deleteUser = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const client = await pool.connect();
  try {
    if (!req.user?.id) {
      res.status(401).json({ error: "인증되지 않은 요청입니다." });
      return;
    }
    const result = await client.query(`DELETE FROM users WHERE id = $1`, [
      req.user.id,
    ]);
    res.status(200).json({
      success: true,
      message: "사용자 정보를 삭제했습니다.",
    });
  } catch (error) {
    next(error);
  } finally {
    client.release();
  }
};
