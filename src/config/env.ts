import { config } from "dotenv";

config({ path: `.env.${process.env.NODE_ENV || "development"}.local` });

export const {
  PORT,
  NODE_ENV,
  PG_HOST,
  PG_DATABASE,
  PG_USER,
  PG_PASSWORD,
  PG_PORT,
  JWT_SECRET,
  JWT_REFRESH_SECRET,
  JWT_EXPIRES_IN,
  JWT_REFRESH_EXPIRES_IN,
  ARCJET_KEY,
  ARCJET_ENV,
} = process.env;
