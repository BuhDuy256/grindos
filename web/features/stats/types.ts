export interface StatsSnapshot {
  level: number;
  exp: number;
  str_stat: number;
  int_stat: number;
  vit_stat: number;
  streak: number;
  difficulty_multiplier: number;
}

export interface Stats extends StatsSnapshot {
  user_id?: string;
}

export interface PlayerProfileResponse extends StatsSnapshot {
  user_id: string;
  stats?: StatsSnapshot;
}

export interface EcrEntry {
  date: string;
  ecr_score: number;
  learning_summary: string | null;
  ai_insight: string | null;
}

export interface EcrHistoryResponse {
  history: EcrEntry[];
}
