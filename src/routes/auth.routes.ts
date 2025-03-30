import { Router } from "express";
import {
  signUp,
  signIn,
  signOut,
  refreshToken,
} from "../controllers/auth.controller";
import { authenticateToken } from "../middlewares/auth.middleware";
import { CreateUserSchema } from "../models/user";
import { validate } from "../middlewares/validate.middleware";

const authRouter = Router();

// path: /api/v1/auth
authRouter.post("/sign-up", validate(CreateUserSchema), signUp);
authRouter.post("/sign-in", signIn);
authRouter.post("/sign-out", authenticateToken, signOut);
authRouter.post("/refresh-token", authenticateToken, refreshToken);

export default authRouter;
