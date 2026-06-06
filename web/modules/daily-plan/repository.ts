import type { DailyPlanDocument, TaskDocument } from "./type";

export interface CreateTaskInput {
  planId: number;
  parentId: number | null;
  title: string;
  durationMins: number;
}

export interface UpdateTaskInput {
  title?: string;
  durationMins?: number;
}

export interface CreatePlanInput {
  userId: number;
  date: string;
}

export interface AiTaskInput {
  title: string;
  description: string | null;
  durationMins: number;
  parentId: number | null;
  originType: string;
  modificationState: string;
}

export interface UpdatePlanInput {
  ecrScore?: number | null;
  userNote?: string | null;
  learningSummary?: string | null;
  aiInsight?: string | null;
}

export interface DailyPlanRepository {
  findPlanByUserAndDate(userId: number, date: string): Promise<DailyPlanDocument | null>;
  findPlanById(planId: number): Promise<DailyPlanDocument | null>;
  createPlan(input: CreatePlanInput): Promise<DailyPlanDocument>;
  createPlanWithTasks(
    userId: number, date: string, systemMessage: string, progressAnalysis: string,
    tasks: AiTaskInput[],
  ): Promise<number>;
  addTasksToPlan(planId: number, tasks: AiTaskInput[]): Promise<void>;
  updatePlan(planId: number, input: UpdatePlanInput): Promise<boolean>;
  getLastNPlans(userId: number, n: number): Promise<DailyPlanDocument[]>;
  findTasksByPlanId(planId: number): Promise<TaskDocument[]>;
  findAllTasksByPlanId(planId: number): Promise<TaskDocument[]>;
  findTaskById(taskId: number): Promise<TaskDocument | null>;
  createTask(input: CreateTaskInput): Promise<TaskDocument>;
  toggleTaskComplete(taskId: number): Promise<boolean | null>;
  updateTask(taskId: number, input: UpdateTaskInput): Promise<boolean>;
  updateTaskModification(taskId: number, state: string, durationMins?: number): Promise<boolean>;
  markTasksCompleted(taskIds: number[]): Promise<void>;
  softDeleteTask(taskId: number): Promise<boolean>;
  updateUserNote(userId: number, date: string, userNote: string): Promise<boolean>;
  getEcrHistory(userId: number, days: number): Promise<DailyPlanDocument[]>;
  resetUserPlans(userId: number): Promise<void>;
}
