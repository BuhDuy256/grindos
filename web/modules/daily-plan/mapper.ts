import { toApiId } from "@/lib/id";
import type {
  DailyPlanDTO,
  DailyPlanDocument,
  EcrHistoryDTO,
  TaskDTO,
  TaskDocument,
} from "./type";

export function mapTaskToDTO(task: TaskDocument): TaskDTO {
  return {
    id: toApiId(task.id),
    plan_id: toApiId(task.dailyPlanId),
    parent_id: task.parentId === null ? null : toApiId(task.parentId),
    title: task.title,
    description: task.description,
    duration_mins: task.durationMins,
    is_completed: task.isCompleted,
    modification_state: task.modificationState,
    origin_type: task.originType,
  };
}

export function mapDailyPlanToDTO(
  plan: DailyPlanDocument,
  tasks: TaskDocument[],
): DailyPlanDTO {
  return {
    id: toApiId(plan.id),
    date: plan.date,
    system_message: plan.systemMessage,
    progress_analysis: plan.progressAnalysis,
    ecr_score: plan.ecrScore,
    user_note: plan.userNote,
    tasks: tasks.map(mapTaskToDTO),
  };
}

export function mapEcrHistoryToDTO(plans: DailyPlanDocument[]): EcrHistoryDTO {
  return {
    history: plans.map((plan) => ({
      date: plan.date,
      ecr_score: plan.ecrScore ?? 0,
      learning_summary: plan.learningSummary ?? null,
      ai_insight: plan.aiInsight ?? null,
    })),
  };
}
