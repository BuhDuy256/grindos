import { apiClient } from "@/lib/api-client";
import type { DailyPlan, PlayerStats } from "../types";

export function fetchAdminStats(userId: string) {
  return apiClient.get<PlayerStats>(`/admin/player/profile?user_id=${userId}`);
}

export function fetchAdminPlan(userId: string, date: string) {
  return apiClient.get<DailyPlan>(`/v1/daily-plan?user_id=${userId}&date=${date}`);
}

export function saveAdminNote(userId: string, date: string, note: string) {
  return apiClient.post<{ ok: boolean }>("/v1/daily-plan/end-day", {
    user_id: userId,
    date,
    user_note: note,
  });
}

export function runThinking(userId: string, date: string) {
  return apiClient.post("/admin/thinking/run", { user_id: userId, date });
}

export function runLearning(userId: string, date: string) {
  return apiClient.post("/admin/learning/run", { user_id: userId, date });
}

export function resetUser(userId: string) {
  return apiClient.delete(`/admin/user/${userId}/reset`);
}
