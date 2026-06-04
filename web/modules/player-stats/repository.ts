import type { PlayerStatsDocument } from "./type";

export interface TaskCompletionStatDelta {
  exp: number;
  strStat: number;
  intStat: number;
  vitStat: number;
  difficultyMultiplier: number;
}

export interface UpdateStatsInput {
  level?: number;
  exp?: number;
  strStat?: number;
  intStat?: number;
  vitStat?: number;
  streak?: number;
  difficultyMultiplier?: number;
}

export interface PlayerStatsRepository {
  createDefault(userId: number): Promise<PlayerStatsDocument>;
  findByUserId(userId: number): Promise<PlayerStatsDocument | null>;
  applyTaskCompletionDelta(
    userId: number,
    delta: TaskCompletionStatDelta,
  ): Promise<PlayerStatsDocument | null>;
  updateStats(userId: number, input: UpdateStatsInput): Promise<boolean>;
  resetForUser(userId: number): Promise<boolean>;
}
