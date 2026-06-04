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

export interface DailyPlanRepository {
  findPlanByUserAndDate(userId: number, date: string): Promise<DailyPlanDocument | null>;
  findPlanById(planId: number): Promise<DailyPlanDocument | null>;
  createPlan(input: CreatePlanInput): Promise<DailyPlanDocument>;
  findTasksByPlanId(planId: number): Promise<TaskDocument[]>;
  findTaskById(taskId: number): Promise<TaskDocument | null>;
  createTask(input: CreateTaskInput): Promise<TaskDocument>;
  toggleTaskComplete(taskId: number): Promise<boolean | null>;
  updateTask(taskId: number, input: UpdateTaskInput): Promise<boolean>;
  softDeleteTask(taskId: number): Promise<boolean>;
  updateUserNote(userId: number, date: string, userNote: string): Promise<boolean>;
  getEcrHistory(userId: number, days: number): Promise<DailyPlanDocument[]>;
  resetUserPlans(userId: number): Promise<void>;
}
