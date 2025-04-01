import { Router } from "express";
import {
  signUp,
  signIn,
  signOut,
  refreshToken,
} from "../controllers/auth.controller";
// import { authenticateToken } from "../middlewares/auth.middleware";
// import { CreateUserSchema } from "../models/user";
// import { validate } from "../middlewares/validate.middleware";

const authRouter = Router();

// path: /api/v1/auth
authRouter.post("/sign-up", signUp);
authRouter.post("/sign-in", signIn);
authRouter.post("/sign-out", signOut);
// authRouter.post("/refresh", authenticateToken);
authRouter.post("/refresh", refreshToken);

export default authRouter;
