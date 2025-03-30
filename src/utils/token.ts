import jwt from "jsonwebtoken";
import { JWT_SECRET, JWT_REFRESH_SECRET } from "../config/env";
import redisClient from "../config/redis";

export const generateAccessToken = (userId: string) => {
  return jwt.sign({ userId: userId }, JWT_SECRET || "secret", {
    expiresIn: "1h",
  });
};

export const generateRefreshToken = (userId: string) => {
  const refreshToken = jwt.sign(
    { userId: userId },
    JWT_REFRESH_SECRET || "secret",
    { expiresIn: "7d" }
  );

  // Redis에 리프레시 토큰 저장
  redisClient.set(
    `refresh_${userId}`,
    refreshToken,
    { EX: 60 * 60 * 24 * 7 } // 7일
  );

  return refreshToken;
};

export const blacklistToken = async (token: string) => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET || "secret") as {
      exp: number;
    };
    const exp = decoded.exp;
    const now = Math.floor(Date.now() / 1000);
    const ttl = exp - now; // 남은 만료 시간

    if (ttl > 0) {
      await redisClient.set(`bl_${token}`, "1", { EX: ttl });
    }

    return true;
  } catch (error) {
    console.error("Token blacklist error:", error);
    return false;
  }
};

// 토큰이 블랙리스트에 있는지 확인
export const isTokenBlacklisted = async (token: string) => {
  const result = await redisClient.get(`bl_${token}`);
  return result !== null;
};

// 리프레시 토큰 검증
export const verifyRefreshToken = async (userId: string, token: string) => {
  try {
    // Redis에 저장된 리프레시 토큰 가져오기
    const storedToken = await redisClient.get(`refresh_${userId}`);

    if (!storedToken || storedToken !== token) {
      return false;
    }

    // 토큰 검증
    jwt.verify(token, JWT_REFRESH_SECRET || "secret");
    return true;
  } catch (error) {
    console.error("Refresh token verification error:", error);
    return false;
  }
};

export const generateCsrfToken = async () => {
  const response = await fetch("http://localhost:5500/api/v1/csrf-token", {
    method: "GET",
    credentials: "include",
  });
  const data = await response.json();
  console.log("generated csrf token ", data);
  return data.csrfToken;
};
