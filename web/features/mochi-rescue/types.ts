export type MochiStage = "trapped" | "struggling" | "almost-free" | "rescued";

export type MochiEffectType =
  | "TASK_COMPLETED"
  | "TASK_UNCOMPLETED"
  | "STAGE_ADVANCED"
  | "STAGE_REVERSED"
  | "ALL_TASKS_COMPLETED"
  | "ROLLBACK";

export interface MochiEffectEvent {
  id: string;
  type: MochiEffectType;
  date: string;
  taskId: string;
  fromProgress: number;
  toProgress: number;
  fromStage: MochiStage;
  toStage: MochiStage;
  createdAt: number;
  soundKey?: string;
}
