import { z } from "zod";

export const UserSchema = z.object({
  id: z.string(),
  username: z.string().min(2).max(10),
  email: z.string().email(),
  password: z.string().min(8),
  profile_image: z.string().nullable().optional(),
  bio: z.string().nullable().optional(),
  last_login: z.date().nullable(),
  is_active: z.boolean(),
  created_at: z.date(),
  updated_at: z.date(),
});

export const CreateUserSchema = UserSchema.pick({
  username: true,
  email: true,
  password: true,
});

export const UpdateUserSchema = UserSchema.pick({
  username: true,
  email: true,
  password: true,
  profile_image: true,
  bio: true,
});

export type User = z.infer<typeof UserSchema>;
export type CreateUser = z.infer<typeof CreateUserSchema>;
export type UpdateUser = z.infer<typeof UpdateUserSchema>;
