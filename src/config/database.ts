import { Pool } from "pg";
import { NODE_ENV } from "./env";

import { PG_HOST, PG_DATABASE, PG_USER, PG_PASSWORD, PG_PORT } from "./env";

export const pool = new Pool({
  host: PG_HOST,
  database: PG_DATABASE,
  user: PG_USER,
  password: PG_PASSWORD,
  port: PG_PORT ? parseInt(PG_PORT) : 5432,
  ssl: {
    rejectUnauthorized: false,
  },
});

export const initPostgresDB = async () => {
  const client = await pool.connect();
  try {
    // await pool.connect();
    const result = await client.query(`SELECT * FROM users`);
    // console.log(result.rows);

    console.log(`Database connected successfully in ${NODE_ENV} mode.`);
  } catch (error) {
    console.error("Database connection failed.", error);
  } finally {
    client.release();
  }
};
