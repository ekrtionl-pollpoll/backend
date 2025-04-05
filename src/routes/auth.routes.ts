import { Router } from "express";
import {
  signUp,
  signIn,
  signOut,
  refreshToken,
  checkEmailDuplicate,
  checkUsernameDuplicate,
  verifyEmail,
} from "../controllers/auth.controller";

const authRouter = Router();

// path: /api/v1/auth
authRouter.post("/sign-up", signUp);
authRouter.post("/sign-in", signIn);
authRouter.post("/sign-out", signOut);
authRouter.post("/refresh", refreshToken);

// check availability of email and username
authRouter.post("/check/email", checkEmailDuplicate);
authRouter.post("/check/username", checkUsernameDuplicate);
authRouter.post("/verify/email/:code", verifyEmail);

export default authRouter;
