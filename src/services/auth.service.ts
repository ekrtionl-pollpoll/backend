import { pool } from "../config/database";
import { CreateUser, SignInUser } from "../models/user.model";
import { sendVerificationEmail } from "../utils/email.utils";
import {
  comparePassword,
  createVerificationToken,
  hashPassword,
  isEmailTaken,
  isUsernameTaken,
} from "../utils/user.utils";
import { v4 as uuidv4 } from "uuid";
import appAssert from "../utils/appAssert";
import AppErrorCode from "../constants/appErrorCode";
import { CONFLICT, UNAUTHORIZED } from "../constants/http";
import { refreshTokenSignOptions, verifyToken, signToken } from "../utils/jwt";

export const createUser = async (data: CreateUser) => {
  const client = await pool.connect();
  try {
    const [emailExists, usernameExists] = await Promise.all([
      isEmailTaken(data.email),
      isUsernameTaken(data.username),
    ]);

    appAssert(!emailExists, CONFLICT, "이메일이 이미 사용 중입니다.");

    appAssert(!usernameExists, CONFLICT, "사용자 이름이 이미 사용 중입니다.");

    // create user
    // 트랜잭션 시작
    await client.query("BEGIN");
    const id = uuidv4();
    const hashedPassword = await hashPassword(data.password);
    const userResult = await client.query(
      `INSERT INTO users (id, email, password, username, profile_image, bio, is_active, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, null, null, true, NOW(), NOW()) 
       RETURNING id, email, username, profile_image, bio, is_active, created_at, updated_at`,
      [id, data.email, hashedPassword, data.username]
    );

    // 이메일 인증 토큰 생성
    // const verificationToken = await createVerificationToken(id);

    await client.query("COMMIT");
    // Send verification email
    // await sendVerificationEmail(data.email, verificationToken);

    return userResult.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const signInUser = async (data: SignInUser) => {
  const client = await pool.connect();
  try {
    const existingUser = await client.query(
      "SELECT * FROM users WHERE email = $1",
      [data.email]
    );

    console.log(existingUser.rows);

    appAssert(
      existingUser.rows.length > 0,
      UNAUTHORIZED,
      "이메일 또는 비밀번호가 일치하지 않습니다. 이메일"
    );

    const isMatch = await comparePassword(
      data.password,
      existingUser.rows[0].password
    );

    appAssert(
      isMatch,
      UNAUTHORIZED,
      "이메일 또는 비밀번호가 일치하지 않습니다. 비밀번호"
    );

    const { password: _, ...user } = existingUser.rows[0];

    await client.query("BEGIN");

    await client.query("UPDATE users SET last_login = NOW() WHERE id = $1", [
      user.id,
    ]);

    const sessionId = uuidv4();

    await client.query(
      "INSERT INTO sessions (id, user_id, user_agent, created_at, expires_at) VALUES ($1, $2, $3, NOW(), NOW() + INTERVAL '1 days')",
      [sessionId, user.id, data.user_agent] // userAgent도 저장
    );
    await client.query("COMMIT");

    return { user, sessionId };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const refreshUserAccessToken = async (refreshToken: string) => {
  const client = await pool.connect();
  try {
    const { payload } = verifyToken(refreshToken, {
      secret: refreshTokenSignOptions.secret,
    });

    appAssert(payload, UNAUTHORIZED, "유효하지 않은 리프레시 토큰입니다.");

    const { sessionId } = payload;
    const session = await client.query("SELECT * FROM sessions WHERE id = $1", [
      sessionId,
    ]);

    appAssert(
      session.rows.length > 0 &&
        session.rows[0].expires_at.getTime() > Date.now(),
      UNAUTHORIZED,
      "세션이 존재하지 않습니다."
    );

    // refresh the session if it expires in the next 24 hours
    const sessionNeedsRefresh =
      session.rows[0].expires_at.getTime() - Date.now() < 24 * 60 * 60 * 1000;

    await client.query("BEGIN");

    if (sessionNeedsRefresh) {
      await client.query(
        "UPDATE sessions SET expires_at = NOW() + INTERVAL '7 days' WHERE id = $1",
        [sessionId]
      );
    }

    const newRefreshToken = sessionNeedsRefresh
      ? signToken({ sessionId }, refreshTokenSignOptions)
      : undefined;

    const newAccessToken = signToken({
      userId: session.rows[0].user_id,
      sessionId,
    });

    await client.query("COMMIT");

    return {
      accessToken: newAccessToken,
      newRefreshToken: newRefreshToken,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};
