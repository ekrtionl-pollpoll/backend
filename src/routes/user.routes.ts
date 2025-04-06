import { Router } from "express";
import {
  getUsers,
  getUser,
  updateUser,
  deleteUser,
} from "../controllers/user.controller";
const userRouter = Router();

userRouter.get("/", getUsers);

userRouter.get("/me", getUser);

userRouter.put("/me", updateUser);

userRouter.delete("/me", deleteUser);

export default userRouter;
