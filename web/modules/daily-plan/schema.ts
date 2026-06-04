import { z } from "zod";
import { apiIdSchema } from "@/lib/id";

export const dateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date");

export const getDailyPlanQuerySchema = z.object({
  user_id: apiIdSchema,
  date: dateSchema.optional(),
});

export const createDailyPlanSchema = z.object({
  user_id: apiIdSchema,
  date: dateSchema.optional(),
});

export const createTaskSchema = z.object({
  plan_id: apiIdSchema,
  parent_id: apiIdSchema.nullable().optional(),
  title: z.string().trim().min(1, "title required").max(500),
  duration_mins: z.number().int().positive("duration_mins must be positive"),
});

export const updateTaskSchema = z
  .object({
    title: z.string().trim().min(1).max(500).optional(),
    duration_mins: z.number().int().positive().optional(),
  })
  .refine((value) => value.title !== undefined || value.duration_mins !== undefined, {
    message: "Nothing to update",
  });

export const endDaySchema = z.object({
  user_id: apiIdSchema,
  date: dateSchema,
  user_note: z.string(),
});

export const playerQuerySchema = z.object({
  user_id: apiIdSchema,
});

export const ecrHistoryQuerySchema = z.object({
  user_id: apiIdSchema,
  days: z.coerce.number().int().min(1).max(365).optional().default(7),
});
