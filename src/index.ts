import express from "express";
import cors from "cors";

import { PORT } from "./config/env";
import userRouter from "./routes/user.routes";
import authRouter from "./routes/auth.routes";
import { initPostgresDB } from "./config/database";
import cookieParser from "cookie-parser";
import arcjetMiddleware from "./middlewares/arcjet.middleware";
import csrf from "csurf";
import redisClient from "./config/redis";
import morgan from "morgan";
import crypto from "crypto";

const app = express();

redisClient.connect().catch(console.error);
redisClient.on("ready", () => {
  console.log("Redis connected");
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser(process.env.COOKIE_SECRET || "cookie-secret"));

// CORS 설정
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  })
);
if (process.env.NODE_ENV === "production") {
  app.use(morgan("combined"));
} else {
  app.use(morgan("dev"));
}
app.use(arcjetMiddleware);
app.disable("etag");
// CSRF 보호 설정
const csrfProtection = csrf({
  cookie: {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
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

async function startServer() {
  await initPostgresDB().catch(console.error);

  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}

startServer();
