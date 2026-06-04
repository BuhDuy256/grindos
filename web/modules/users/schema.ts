import { z } from "zod";
import { apiIdSchema } from "@/lib/id";

export const registerSchema = z.object({
  username: z.string().trim().min(1, "username and password required").max(255),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const loginSchema = z.object({
  username: z.string().trim().min(1, "username and password required").max(255),
  password: z.string().min(1, "username and password required"),
});

export const onboardSchema = z.object({
  user_id: apiIdSchema.optional(),
  username: z.string().trim().optional().default(""),
  timezone: z.string().trim().optional().default(""),
  main_goal: z.string().trim().min(1, "main_goal required"),
  user_context: z.string().optional().nullable(),
});

export const runPipelineSchema = z.object({
  user_id: apiIdSchema,
  date: z.string().trim().optional().nullable(),
});
