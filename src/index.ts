import express from "express";
import cors from "cors";

import { COOKIE_SECRET, FRONTEND_URL, NODE_ENV, PORT } from "./constants/env";
import userRouter from "./routes/user.routes";
import authRouter from "./routes/auth.routes";
import { initPostgresDB } from "./config/database";
import cookieParser from "cookie-parser";
// import arcjetMiddleware from "./middlewares/arcjet.middleware";
import csrf from "csurf";
// import redisClient from "./config/redis";
import morgan from "morgan";
import crypto from "crypto";
import errorHandler from "./middlewares/error.middleware";
import catchError from "./utils/catchError";
import { configureSessionPostgres } from "./config/session";

// 세션 타입 확장
declare module "express-session" {
  interface SessionData {
    userId: string;
    email: string;
    username: string;
  }
}

const app = express();

// redisClient.connect().catch(console.error);
// redisClient.on("ready", () => {
//   console.log("Redis connected");
// });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true,
  })
);
app.use(cookieParser(COOKIE_SECRET));
configureSessionPostgres(app);

if (NODE_ENV === "production") {
  app.use(morgan("combined"));
} else {
  app.use(morgan("dev"));
}

// app.use(arcjetMiddleware);
app.disable("etag");
// CSRF 보호 설정
const csrfProtection = csrf({
  cookie: {
    httpOnly: false,
    secure: NODE_ENV === "production",
    sameSite: "strict",
  },
});

// CSRF 토큰 발급 엔드포인트
app.get("/api/v1/csrf-token", (req, res) => {
  const csrfToken = crypto.randomBytes(32).toString("hex");
  res.cookie("XSRF-TOKEN", csrfToken, {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });
  res.json({ csrfToken });
});

// 인증이 필요한 라우트에만 CSRF 보호 적용
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/users", csrfProtection, userRouter);

app.get(
  "/abc",
  catchError(async (req, res) => {
    throw new Error("test error");
  })
);

app.use(errorHandler);

async function startServer() {
  await initPostgresDB().catch(console.error);

  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}

startServer();
