import { refreshTokenSignOptions, signToken } from "./jwt";

declare module "express-serve-static-core" {
  interface Response {
    clearCookie(name: string, options?: CookieOptions): Response;
  }
}

export const generateAccessToken = (userId: string, sessionId: string) => {
  const accessToken = signToken({ userId, sessionId });
  return accessToken;
};

export const generateRefreshToken = (userId: string, sessionId: string) => {
  const refreshToken = signToken(
    { userId, sessionId },
    refreshTokenSignOptions
  );

  return refreshToken;
};

// 세션 설정 함수
export const setSessionData = ({
  req,
  userId,
  email,
  username,
  csrfToken,
}: {
  req: any;
  userId: string;
  email: string;
  username: string;
  csrfToken: string;
}): void => {
  if (req.session) {
    req.session.userId = userId;
    req.session.email = email;
    req.session.username = username;
    req.session.isAuthenticated = true;
    req.session.csrfToken = csrfToken;
  }
};
