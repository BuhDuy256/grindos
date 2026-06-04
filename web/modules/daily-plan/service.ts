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

// ── AI Core admin operations ──────────────────────────────────────────────────

export async function createPlanWithTasks(
  userId: number, date: string, systemMessage: string, progressAnalysis: string,
  tasks: { title: string; description: string | null; duration_mins: number; parent_id: number | null; origin_type: string; modification_state: string }[],
) {
  const planId = await dailyPlanRepository.createPlanWithTasks(
    userId, date, systemMessage, progressAnalysis,
    tasks.map((t) => ({
      title: t.title,
      description: t.description,
      durationMins: t.duration_mins,
      parentId: t.parent_id,
      originType: t.origin_type,
      modificationState: t.modification_state,
    })),
  );
  return { plan_id: planId };
}

export async function updatePlan(planId: number, fields: {
  ecr_score?: number | null; user_note?: string | null;
  learning_summary?: string | null; ai_insight?: string | null;
}) {
  await dailyPlanRepository.updatePlan(planId, {
    ecrScore: fields.ecr_score,
    userNote: fields.user_note,
    learningSummary: fields.learning_summary,
    aiInsight: fields.ai_insight,
  });
  return { ok: true };
}

export async function getLastNPlans(userId: number, limit: number) {
  const plans = await dailyPlanRepository.getLastNPlans(userId, limit);
  return plans.map((p) => ({
    id: p.id,
    date: p.date,
    ecr_score: p.ecrScore,
    user_note: p.userNote,
    learning_summary: p.learningSummary ?? null,
  }));
}

export async function getPlanTasksFlat(planId: number) {
  const tasks = await dailyPlanRepository.findAllTasksByPlanId(planId);
  return tasks.map((t) => ({
    id: t.id,
    parent_id: t.parentId,
    title: t.title,
    description: t.description,
    duration_mins: t.durationMins,
    is_completed: t.isCompleted,
    origin_type: t.originType,
    modification_state: t.modificationState,
  }));
}

export async function getPlanTasksTree(planId: number) {
  const flat = await getPlanTasksFlat(planId);
  const map = new Map<number, typeof flat[0] & { subtasks?: unknown[]; depth: number }>();
  flat.forEach((t) => map.set(t.id, { ...t, depth: 0, subtasks: [] }));
  const roots: (typeof flat[0] & { depth: number })[] = [];
  map.forEach((node) => {
    if (node.parent_id === null) {
      roots.push(node);
    } else {
      const parent = map.get(node.parent_id);
      if (parent) {
        node.depth = parent.depth + 1;
        (parent.subtasks as unknown[]).push(node);
      }
    }
  });
  return roots;
}

export async function updateTaskModification(taskId: number, state: string, durationMins?: number) {
  await dailyPlanRepository.updateTaskModification(taskId, state, durationMins);
  return { ok: true };
}

export async function markTasksCompleted(taskIds: number[]) {
  await dailyPlanRepository.markTasksCompleted(taskIds);
  return { ok: true };
}

export async function getAdminDailyPlan(userId: number, date: string) {
  const plan = await dailyPlanRepository.findPlanByUserAndDate(userId, date);
  if (!plan) return null;
  return {
    id: plan.id,
    date: plan.date,
    system_message: plan.systemMessage,
    progress_analysis: plan.progressAnalysis,
    ecr_score: plan.ecrScore,
    user_note: plan.userNote,
    learning_summary: plan.learningSummary ?? null,
    ai_insight: plan.aiInsight ?? null,
  };
}
