import { pool } from "../config/database";

export const deleteSession = async (sessionId: string) => {
  const client = await pool.connect();
  try {
    await client.query("DELETE FROM sessions WHERE id = $1", [sessionId]);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};
