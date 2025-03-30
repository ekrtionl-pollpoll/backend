import { Request, Response, NextFunction } from "express";
import { AnyZodObject } from "zod";

export const validate = (schema: AnyZodObject) => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      console.log(req.body);
      await schema.parseAsync(req.body);
      next();
    } catch (error) {
      res.status(400).json({ success: false, error: "잘못된 요청입니다." });
    }
  };
};
