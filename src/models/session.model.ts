import { z } from "zod";

export const SessionSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  user_agent: z.string(),
  created_at: z.date(),
  expires_at: z.date(),
});

export type Session = z.infer<typeof SessionSchema>;

export const CreateSessionSchema = SessionSchema.pick({
  user_id: true,
  user_agent: true,
});

export type CreateSession = z.infer<typeof CreateSessionSchema>;
