import { z } from "zod";
import { ApiError } from "./api-error";

export const apiIdSchema = z.preprocess(
  (value) => (typeof value === "number" ? String(value) : value),
  z.string().trim().regex(/^\d+$/, "Invalid id"),
);

export function parseApiId(value: string, label = "id"): number {
  const result = apiIdSchema.safeParse(value);
  if (!result.success) {
    throw new ApiError(400, `Invalid ${label}`);
  }

  const id = Number(result.data);
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new ApiError(400, `Invalid ${label}`);
  }

  return id;
}

export function toApiId(id: number): string {
  return String(id);
}
