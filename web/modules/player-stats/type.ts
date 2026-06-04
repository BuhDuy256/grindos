import type { ObjectId } from "mongodb";

export interface PlayerStatsDocument {
  _id?: ObjectId;
  userId: number;
  level: number;
  exp: number;
  strStat: number;
  intStat: number;
  vitStat: number;
  streak: number;
  difficultyMultiplier: number;
  schemaVersion: 1;
  createdAt: Date;
  updatedAt: Date;
}

export interface PlayerStatsDTO {
  level: number;
  exp: number;
  str_stat: number;
  int_stat: number;
  vit_stat: number;
  streak: number;
  difficulty_multiplier: number;
}

export interface PlayerProfileDTO extends PlayerStatsDTO {
  user_id: string;
  stats: PlayerStatsDTO;
}
