import type express from "express";
import session from "express-session";
import pgSession from "connect-pg-simple";
import { pool } from "./database";

export const configureSessionMemory = (app: express.Application): void => {
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "your-secret-key",
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 24 * 60 * 60 * 1000, // 1일
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
      },
    })
  );
};

// PostgreSQL 세션 스토어 설정
const PgStore = pgSession(session);

export const configureSessionPostgres = (app: express.Application): void => {
  // 세션 테이블이 없으면 생성
  pool.query(`
    CREATE TABLE IF NOT EXISTS sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- UUID 기본값 설정
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '30 days') NOT NULL
    );
  `);

  // 세션 미들웨어 설정
  app.use(
    session({
      store: new PgStore({
        pool,
        tableName: "session",
        createTableIfMissing: true,
      }),
      secret: process.env.SESSION_SECRET || "your-secret-key",
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 24 * 60 * 60 * 1000, // 1일
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
      },
    })
  );
};
