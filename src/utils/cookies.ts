import { NODE_ENV } from "../constants/env";
import { CookieOptions, Response } from "express";

export const REFRESH_TOKEN_PATH = "/api/v1/auth/refresh";
const secure = NODE_ENV === "production";

const defaults: CookieOptions = {
  sameSite: "strict",
  httpOnly: true,
  secure,
  maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
};

export const getAccessTokenCookieOptions = (): CookieOptions => ({
  ...defaults,
  expires: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
});

export const getRefreshTokenCookieOptions = (): CookieOptions => ({
  ...defaults,
  expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
  path: REFRESH_TOKEN_PATH,
});

type Params = {
  res: Response;
  accessToken: string;
  refreshToken: string;
};

export const setAuthCookies = ({ res, accessToken, refreshToken }: Params) => {
  res.cookie("accessToken", accessToken, {
    ...defaults,
    expires: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
  });
  res.cookie("refreshToken", refreshToken, {
    ...defaults,
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    path: REFRESH_TOKEN_PATH,
  });
};

export const clearAuthCookies = (res: Response) => {
  res.clearCookie("accessToken");
  res.clearCookie("refreshToken", {
    path: REFRESH_TOKEN_PATH,
  });
};
