import { z } from "zod";

export const signUpSchema = z
  .object({
    email: z.string().email(),
    username: z.string().min(3).max(12),
    password: z.string().min(8).max(255),
    confirmPassword: z.string().min(8).max(255),
    userAgent: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "비밀번호가 일치하지 않습니다.",
  });

export const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(255),
  userAgent: z.string().optional(),
});

export const verificationCodeSchema = z.string().min(1).max(36);
