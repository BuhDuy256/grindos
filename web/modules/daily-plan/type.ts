import type { ObjectId } from "mongodb";

export type OriginType = "SYSTEM_GENERATED" | "USER_CREATED";
export type ModificationState = "UNCHANGED" | "EDITED" | "DELETED";

export interface DailyPlanDocument {
  _id?: ObjectId;
  id: number;
  userId: number;
  date: string;
  progressAnalysis: string | null;
  systemMessage: string | null;
  ecrScore: number | null;
  userNote: string | null;
  learningSummary?: string | null;
  aiInsight?: string | null;
  schemaVersion: 1;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface TaskDocument {
  _id?: ObjectId;
  id: number;
  dailyPlanId: number;
  parentId: number | null;
  title: string;
  description: string | null;
  durationMins: number;
  isCompleted: boolean;
  originType: OriginType;
  modificationState: ModificationState;
  schemaVersion: 1;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface TaskDTO {
  id: string;
  plan_id: string;
  parent_id: string | null;
  title: string;
  description: string | null;
  duration_mins: number;
  is_completed: boolean;
  modification_state: ModificationState;
  origin_type: OriginType;
}

export interface DailyPlanDTO {
  id: string;
  date: string;
  system_message: string | null;
  progress_analysis: string | null;
  ecr_score: number | null;
  user_note: string | null;
  tasks: TaskDTO[];
}

export interface EcrHistoryDTO {
  history: {
    date: string;
    ecr_score: number;
    learning_summary: string | null;
    ai_insight: string | null;
  }[];
}
