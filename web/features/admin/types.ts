import type { DailyPlan } from "@/features/daily-plan/types";

export interface PlayerStats {
  user_id: string;
  level: number;
  exp: number;
  str_stat: number;
  int_stat: number;
  vit_stat: number;
  streak: number;
  difficulty_multiplier: number;
}

export type { DailyPlan };
