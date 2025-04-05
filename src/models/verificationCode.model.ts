import { z } from "zod";

export const VerificationCodeSchema = z.object({
  id: z.string(),
  userId: z.string(),
  type: z.string(),
  expiresAt: z.date(),
  createdAt: z.date(),
});

export type VerificationCode = z.infer<typeof VerificationCodeSchema>;

export const CreateVerificationCodeSchema = VerificationCodeSchema.pick({
  userId: true,
  type: true,
  expiresAt: true,
});

export type CreateVerificationCode = z.infer<
  typeof CreateVerificationCodeSchema
>;
