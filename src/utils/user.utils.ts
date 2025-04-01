import { pool } from "../config/database";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export const isEmailTaken = async (email: string): Promise<boolean> => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      "SELECT EXISTS(SELECT 1 FROM users WHERE email = $1)",
      [email]
    );
    return result.rows[0].exists;
  } finally {
    client.release();
  }
};

export const isUsernameTaken = async (username: string): Promise<boolean> => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      "SELECT EXISTS(SELECT 1 FROM users WHERE username = $1)",
      [username]
    );
    return result.rows[0].exists;
  } finally {
    client.release();
  }
};

export const hashPassword = async (
  password: string,
  saltRounds?: number
): Promise<string> => {
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);
  return hashedPassword;
};

export const comparePassword = async (
  password: string,
  hashedPassword: string
): Promise<boolean> => {
  return await bcrypt.compare(password, hashedPassword);
};

export const generateVerificationToken = async (
  userId: string
): Promise<string> => {
  const client = await pool.connect();
  try {
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date();

    // Token expires in 24 hours
    expiresAt.setHours(expiresAt.getHours() + 24);

    await pool.query(
      `INSERT INTO verification_tokens (id, user_id, token, expires_at, created_at) 
     VALUES ($1, $2, $3, $4, NOW())`,
      [crypto.randomUUID(), userId, token, expiresAt]
    );

    return token;
  } finally {
    client.release();
  }
};

// Create verification token for user
export const createVerificationToken = async (
  userId: string
): Promise<string> => {
  const token = generateVerificationToken(userId);
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24); // Token expires in 24 hours

  await pool.query(
    `INSERT INTO verification_tokens (id, user_id, token, expires_at, created_at) 
     VALUES ($1, $2, $3, $4, NOW())`,
    [crypto.randomUUID(), userId, token, expiresAt]
  );

  return token;
};