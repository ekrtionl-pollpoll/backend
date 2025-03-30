import { pool } from "../config/database";

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
