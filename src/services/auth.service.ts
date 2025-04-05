import { pool } from "../config/database";
import { CreateUser, SignInUser } from "../models/user.model";
import {
  comparePassword,
  hashPassword,
  isEmailTaken,
  isUsernameTaken,
} from "../utils/user.utils";
import { v4 as uuidv4 } from "uuid";
import appAssert from "../utils/appAssert";
import {
  CONFLICT,
  UNAUTHORIZED,
  NOT_FOUND,
  INTERNAL_SERVER_ERROR,
  TOO_MANY_REQUESTS,
} from "../constants/http";
import { refreshTokenSignOptions, verifyToken, signToken } from "../utils/jwt";
import {
  getVerifyEmailTemplate,
  getPasswordResetTemplate,
} from "../utils/emailTemplates";
import { sendMail } from "../utils/sendMail";
import { FRONTEND_URL } from "../constants/env";

export const createUser = async (data: CreateUser) => {
  const client = await pool.connect();
  try {
    const [emailExists, usernameExists] = await Promise.all([
      isEmailTaken(data.email),
      isUsernameTaken(data.username),
    ]);

    appAssert(!emailExists, CONFLICT, "이메일이 이미 사용 중입니다.");

    appAssert(!usernameExists, CONFLICT, "사용자 이름이 이미 사용 중입니다.");

    await client.query("BEGIN");
    const id = uuidv4();
    const hashedPassword = await hashPassword(data.password);
    const userResult = await client.query(
      `INSERT INTO users (id, email, password, username, profile_image, bio, is_active, created_at, updated_at, verified) 
       VALUES ($1, $2, $3, $4, null, null, true, NOW(), NOW(), false) 
       RETURNING id, email, username, profile_image, bio, is_active, created_at, updated_at`,
      [id, data.email, hashedPassword, data.username]
    );

    const verificationCode = await client.query(
      `INSERT INTO verification_codes (user_id, type, expires_at) 
       VALUES ($1, $2, NOW() + INTERVAL '10 minutes')
       RETURNING id, user_id, type, expires_at, created_at`,
      [id, "EMAIL_VERIFICATION"]
    );

    const url = `${FRONTEND_URL}/api/v1/auth/check/email/${verificationCode.rows[0].id}`;

    const { error } = await sendMail({
      to: userResult.rows[0].email,
      ...getVerifyEmailTemplate(url),
    });

    appAssert(!error, INTERNAL_SERVER_ERROR, "이메일 전송에 실패했습니다.");

    await client.query("COMMIT");

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
      [sessionId, user.id, data.user_agent]
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

export const verifyEmailService = async (code: string) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const validCode = await client.query(
      `SELECT * FROM verification_codes 
       WHERE id = $1 
       AND type = 'EMAIL_VERIFICATION' 
       AND expires_at > NOW()`,
      [code]
    );

    appAssert(
      validCode.rows.length > 0,
      NOT_FOUND,
      "유효하지 않거나 만료된 인증 코드입니다."
    );

    const updatedUser = await client.query(
      `UPDATE users 
       SET verified = true 
       WHERE id = $1 
       RETURNING id, username, email, profile_image, bio, created_at, updated_at`,
      [validCode.rows[0].user_id]
    );

    appAssert(
      updatedUser.rows.length > 0,
      INTERNAL_SERVER_ERROR,
      "이메일 인증에 실패했습니다."
    );

    await client.query("DELETE FROM verification_codes WHERE id = $1", [
      validCode.rows[0].id,
    ]);

    await client.query("COMMIT");

    return {
      user: {
        id: updatedUser.rows[0].id,
        email: updatedUser.rows[0].email,
        username: updatedUser.rows[0].username,
        profile_image: updatedUser.rows[0].profile_image,
        bio: updatedUser.rows[0].bio,
        created_at: updatedUser.rows[0].created_at,
        updated_at: updatedUser.rows[0].updated_at,
      },
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const sendPasswordResetEmail = async (email: string) => {
  const client = await pool.connect();
  try {
    const user = await client.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);

    appAssert(user.rows.length > 0, NOT_FOUND, "존재하지 않는 이메일입니다.");

    // check email rate limit
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);

    const count = await client.query(
      "SELECT COUNT(*) FROM verification_codes WHERE user_id = $1 AND created_at > $2 AND type = 'PASSWORD_RESET'",
      [user.rows[0].id, fiveMinAgo]
    );

    appAssert(
      count.rows[0].count <= 1,
      TOO_MANY_REQUESTS,
      "인증 코드 전송 횟수가 제한되었습니다. 나중에 다시 시도해주세요."
    );

    const verificationCode = await client.query(
      "INSERT INTO verification_codes (user_id, type, expires_at) VALUES ($1, $2, NOW() + INTERVAL '60 minutes') RETURNING id, user_id, type, expires_at, created_at",
      [user.rows[0].id, "PASSWORD_RESET"]
    );

    const url = `${FRONTEND_URL}/api/v1/auth/password/reset?code=
    ${verificationCode.rows[0].id}&expires_at=${verificationCode.rows[0].expires_at.getTime()}`;

    const { data, error } = await sendMail({
      to: email,
      ...getPasswordResetTemplate(url),
    });

    appAssert(
      data?.id,
      INTERNAL_SERVER_ERROR,
      `${error?.name}: ${error?.message}`
    );

    await client.query("COMMIT");

    return {
      url,
      emailId: data.id,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

type ResetPasswordRequest = {
  password: string;
  verificationCode: string;
};

export const resetPasswordService = async ({
  password,
  verificationCode,
}: ResetPasswordRequest) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const validCode = await client.query(
      `SELECT * FROM verification_codes WHERE id = $1 AND type = 'PASSWORD_RESET' AND expires_at > NOW()`,
      [verificationCode]
    );

    appAssert(
      validCode.rows.length > 0,
      NOT_FOUND,
      "유효하지 않거나 만료된 인증 코드입니다."
    );

    const hashedPassword = await hashPassword(password);

    const updatedUser = await client.query(
      "UPDATE users SET password = $1 WHERE id = $2 RETURNING id, username, email, profile_image, bio, created_at, updated_at",
      [hashedPassword, validCode.rows[0].user_id]
    );

    appAssert(
      updatedUser.rows.length > 0,
      INTERNAL_SERVER_ERROR,
      "비밀번호 초기화에 실패했습니다."
    );

    await client.query("DELETE FROM verification_codes WHERE id = $1", [
      validCode.rows[0].id,
    ]);

    await client.query("DELETE FROM sessions WHERE user_id = $1", [
      validCode.rows[0].user_id,
    ]);

    await client.query("COMMIT");

    return {
      user: updatedUser.rows[0],
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};