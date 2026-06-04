import { apiClient } from "@/lib/api-client";
import type { DailyPlan, Task } from "../types";

function unwrapApiResult<T>(result: { data: T | null; error: string | null }): T {
  if (result.error || !result.data) {
    throw new Error(result.error ?? "Request failed");
  }

  return result.data;
}

export function getDailyPlan(userId: string, date: string) {
  return apiClient.get<DailyPlan>(`/v1/daily-plan?user_id=${userId}&date=${date}`);
}

export function ensureDailyPlan(userId: string, date: string) {
  return apiClient.post<DailyPlan>("/v1/daily-plan", {
    user_id: userId,
    date,
  });
}

export async function getDailyPlanOrCreate(userId: string, date: string) {
  const plan = await getDailyPlan(userId, date);
  if (!plan.error && plan.data) {
    return plan.data;
  }

  if (!plan.error?.toLowerCase().includes("no plan")) {
    throw new Error(plan.error ?? "Daily plan failed to load");
  }

  return unwrapApiResult(await ensureDailyPlan(userId, date));
}

export function saveEndDayNote(userId: string, date: string, userNote: string) {
  return apiClient.post<{ ok: boolean }>("/v1/daily-plan/end-day", {
    user_id: userId,
    date,
    user_note: userNote,
  });
}

export function createTask(input: {
  planId: string;
  parentId: string | null;
  title: string;
  durationMins: number;
}) {
  return apiClient.post<Task>("/v1/daily-plan/task", {
    plan_id: input.planId,
    parent_id: input.parentId,
    title: input.title,
    duration_mins: input.durationMins,
  });
}

export function toggleTaskComplete(taskId: string) {
  return apiClient.patch<{ is_completed: boolean }>("/v1/daily-plan/task", {
    task_id: taskId,
  });
}

export function updateTask(
  taskId: string,
  body: { title?: string; duration_mins?: number },
) {
  return apiClient.patch<{ ok: boolean }>(`/v1/daily-plan/task/${taskId}`, body);
}

export function deleteTask(taskId: string) {
  return apiClient.delete<{ ok: boolean }>(`/v1/daily-plan/task/${taskId}`);
}

export function saveTaskFocusTime(taskId: string, elapsedSeconds: number) {
  return apiClient.post<{ ok: boolean }>(`/v1/daily-plan/task/${taskId}/focus`, {
    elapsed_seconds: elapsedSeconds,
  });
}
