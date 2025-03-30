import { Router } from "express";
import {
  getUsers,
  getUser,
  updateUser,
  deleteUser,
} from "../controllers/user.controller";
import { authenticateToken } from "../middlewares/auth.middleware";
const userRouter = Router();

userRouter.get("/", getUsers);

userRouter.get("/me", authenticateToken, getUser);

userRouter.put("/me", authenticateToken, updateUser);

userRouter.delete("/me", authenticateToken, deleteUser);

export default userRouter;
