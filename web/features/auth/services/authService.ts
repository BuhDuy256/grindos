import { apiClient } from "@/lib/api-client";
import type { AuthResponse } from "../types";

export function login(input: { username: string; password: string }) {
  return apiClient.post<AuthResponse>("/auth/login", input);
}

export function register(input: { username: string; password: string }) {
  return apiClient.post<AuthResponse>("/auth/register", input);
}
