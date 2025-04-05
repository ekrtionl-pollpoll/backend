import { config } from "dotenv";

config({ path: `.env.${process.env.NODE_ENV || "development"}.local` });

const getEnv = (key: string, defaultValue?: string): string => {
  const value = process.env[key] || defaultValue;

  if (!value) {
    throw new Error(`Environment variable ${key} is not set.`);
  }

  return value;
};

// APP
export const PORT = getEnv("PORT", "5500");
export const FRONTEND_URL = getEnv("FRONTEND_URL", "http://localhost:5173");
export const NODE_ENV = getEnv("NODE_ENV", "development");

// DATABASE
export const PG_HOST = getEnv("PG_HOST");
export const PG_DATABASE = getEnv("PG_DATABASE");
export const PG_USER = getEnv("PG_USER");
export const PG_PASSWORD = getEnv("PG_PASSWORD");
export const PG_PORT = getEnv("PG_PORT");

// JWT AUTH
export const JWT_SECRET = getEnv("JWT_SECRET", "secret");
export const JWT_REFRESH_SECRET = getEnv(
  "JWT_REFRESH_SECRET",
  "refresh-secret"
);
export const JWT_EXPIRES_IN = getEnv("JWT_EXPIRES_IN", "1h");
export const JWT_REFRESH_EXPIRES_IN = getEnv("JWT_REFRESH_EXPIRES_IN", "7d");

// ARCJET
export const ARCJET_KEY = getEnv("ARCJET_KEY");
export const ARCJET_ENV = getEnv("ARCJET_ENV", "development");

// COOKIE
export const COOKIE_SECRET = getEnv("COOKIE_SECRET", "cookie-secret");

// RESEND
export const RESEND_API_KEY = getEnv("RESEND_API_KEY");
export const EMAIL_SENDER = getEnv("EMAIL_SENDER");
