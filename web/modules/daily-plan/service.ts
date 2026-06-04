import { ApiError } from "@/lib/api-error";
import { playerStatsRepository } from "@/modules/player-stats/mongo.repository";
import { mapDailyPlanToDTO, mapEcrHistoryToDTO, mapTaskToDTO } from "./mapper";
import { dailyPlanRepository } from "./mongo.repository";
import type { TaskDocument } from "./type";

function getTaskCompletionDelta(task: TaskDocument, isCompleted: boolean) {
  const direction = isCompleted ? 1 : -1;
  const exp = Math.max(5, Math.ceil(task.durationMins / 15) * 5);

  return {
    exp: exp * direction,
    strStat: 1 * direction,
    intStat: (task.durationMins >= 45 ? 1 : 0) * direction,
    vitStat: (task.durationMins >= 25 ? 1 : 0) * direction,
    difficultyMultiplier: 0.01 * direction,
  };
}

export async function getDailyPlan(userId: number, date: string) {
  const plan = await dailyPlanRepository.findPlanByUserAndDate(userId, date);
  if (!plan) {
    throw new ApiError(404, "No plan found for this date");
  }

  const tasks = await dailyPlanRepository.findTasksByPlanId(plan.id);
  return mapDailyPlanToDTO(plan, tasks);
}

export async function ensureDailyPlan(userId: number, date: string) {
  const existing = await dailyPlanRepository.findPlanByUserAndDate(userId, date);
  if (existing) {
    const tasks = await dailyPlanRepository.findTasksByPlanId(existing.id);
    return mapDailyPlanToDTO(existing, tasks);
  }

  const plan = await dailyPlanRepository.createPlan({ userId, date });
  return mapDailyPlanToDTO(plan, []);
}

export async function createTask(input: {
  planId: number;
  parentId: number | null;
  title: string;
  durationMins: number;
}) {
  const plan = await dailyPlanRepository.findPlanById(input.planId);
  if (!plan) {
    throw new ApiError(404, "Plan not found");
  }

  if (input.parentId !== null) {
    const parent = await dailyPlanRepository.findTaskById(input.parentId);
    if (!parent || parent.dailyPlanId !== input.planId) {
      throw new ApiError(400, "Invalid parent task");
    }
  }

  const task = await dailyPlanRepository.createTask(input);
  return mapTaskToDTO(task);
}

export async function toggleTaskComplete(taskId: number) {
  const task = await dailyPlanRepository.findTaskById(taskId);
  if (!task) {
    throw new ApiError(404, "Task not found");
  }

  const isCompleted = await dailyPlanRepository.toggleTaskComplete(taskId);
  if (isCompleted === null) {
    throw new ApiError(404, "Task not found");
  }

  const plan = await dailyPlanRepository.findPlanById(task.dailyPlanId);
  if (plan) {
    await playerStatsRepository.applyTaskCompletionDelta(
      plan.userId,
      getTaskCompletionDelta(task, isCompleted),
    );
  }

  return { is_completed: isCompleted };
}

export async function updateTask(
  taskId: number,
  input: { title?: string; durationMins?: number },
) {
  const ok = await dailyPlanRepository.updateTask(taskId, input);
  if (!ok) {
    throw new ApiError(404, "Task not found");
  }

  return { ok: true };
}

export async function deleteTask(taskId: number) {
  const ok = await dailyPlanRepository.softDeleteTask(taskId);
  if (!ok) {
    throw new ApiError(404, "Task not found");
  }

  return { ok: true };
}

export async function saveEndDayNote(userId: number, date: string, userNote: string) {
  const ok = await dailyPlanRepository.updateUserNote(userId, date, userNote);
  if (!ok) {
    throw new ApiError(404, "No plan found for this date");
  }

  return { ok: true };
}

export async function getEcrHistory(userId: number, days: number) {
  const plans = await dailyPlanRepository.getEcrHistory(userId, days);
  return mapEcrHistoryToDTO(plans);
}

export async function resetUserPlans(userId: number) {
  await dailyPlanRepository.resetUserPlans(userId);
}
