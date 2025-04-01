import { ErrorRequestHandler, Response } from "express";
import { INTERNAL_SERVER_ERROR, BAD_REQUEST } from "../constants/http";
import { z } from "zod";
import AppError from "../utils/AppError";
import { clearAuthCookies } from "../utils/cookies";
import { REFRESH_TOKEN_PATH } from "../utils/cookies";

const handleZodError = (res: Response, error: z.ZodError) => {
  const errors = error.issues.map((err) => ({
    path: err.path.join("."),
    message: err.message,
  }));

  return res.status(BAD_REQUEST).json({
    errors,
    message: error.message,
  });
};

const handleAppError = (res: Response, error: AppError) => {
  return res.status(error.statusCode).json({
    message: error.message,
    errorCode: error.errorCode,
  });
};

const errorHandler: ErrorRequestHandler = ((error, req, res, next) => {
  console.log(`PATH ${req.path}`, error);

  if (req.path === REFRESH_TOKEN_PATH) {
    clearAuthCookies(res);
  }

  if (error instanceof z.ZodError) {
    return handleZodError(res, error);
  }

  if (error instanceof AppError) {
    return handleAppError(res, error);
  }

  return res.status(INTERNAL_SERVER_ERROR).send("Internal server error");
}) as unknown as ErrorRequestHandler;

export default errorHandler;
