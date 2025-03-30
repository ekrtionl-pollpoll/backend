import { NextFunction, Request, Response } from "express-serve-static-core";

interface CustomError extends Error {
  statusCode?: number;
  code?: string;
}

const errorMiddleware = (
  err: CustomError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    console.error(err);

    // 기본 에러 상태 코드 설정
    const statusCode = err.statusCode || 500;
    const message = err.message || "서버 내부 오류가 발생했습니다.";

    // PostgreSQL 중복 키 에러 처리
    if (err.code === "23505") {
      // unique_violation
      return res.status(400).json({
        success: false,
        message: "이미 존재하는 데이터입니다.",
      });
    }

    // PostgreSQL 외래 키 제약 조건 위반
    if (err.code === "23503") {
      // foreign_key_violation
      return res.status(400).json({
        success: false,
        message: "관련된 데이터가 존재하지 않습니다.",
      });
    }

    if (err.code === "42P01") {
      return res.status(400).json({
        success: false,
        message: "테이블이 존재하지 않습니다.",
      });
    }

    // PostgreSQL NOT NULL 제약 조건 위반
    if (err.code === "23502") {
      // not_null_violation
      return res.status(400).json({
        success: false,
        message: "필수 입력값이 누락되었습니다.",
      });
    }

    // JWT 에러 처리
    if (err.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "유효하지 않은 토큰입니다.",
      });
    }

    if (err.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "만료된 토큰입니다.",
      });
    }

    // 일반 에러 응답
    res.status(statusCode).json({
      success: false,
      message,
      ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
    });
  } catch (error) {
    console.error("Error in error middleware:", error);
    res.status(500).json({
      success: false,
      message: "서버 내부 오류가 발생했습니다.",
    });
  }
};

export default errorMiddleware;
