import { NextFunction, Request, Response } from "express";
import aj from "../config/arcjet";

const arcjetMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const decision = await aj.protect(req, { requested: 10 });

    if (decision.isDenied()) {
      if (decision.reason.isRateLimit()) {
        res.status(429).json({ error: "Too Many Requests" });
        return;
      } else if (decision.reason.isBot()) {
        res.status(403).json({ error: "Bot detected" });
        return;
      } else {
        res.status(403).json({ error: "Access denied" });
        return;
      }
    }

    next();
  } catch (error) {
    console.error("Arcjet middleware error:", error);
    // return res.status(500).json({ error: "Internal Server Error" })
    next(error);
  }
};

export default arcjetMiddleware;
