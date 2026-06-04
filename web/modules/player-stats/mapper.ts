import { toApiId } from "@/lib/id";
import type { PlayerProfileDTO, PlayerStatsDTO, PlayerStatsDocument } from "./type";

function mapStatsSnapshot(stats: PlayerStatsDocument): PlayerStatsDTO {
  return {
    level: stats.level,
    exp: stats.exp,
    str_stat: stats.strStat,
    int_stat: stats.intStat,
    vit_stat: stats.vitStat,
    streak: stats.streak,
    difficulty_multiplier: stats.difficultyMultiplier,
  };
}

export function mapPlayerStatsToDTO(stats: PlayerStatsDocument): PlayerProfileDTO {
  const snapshot = mapStatsSnapshot(stats);

  return {
    user_id: toApiId(stats.userId),
    ...snapshot,
    stats: snapshot,
  };
}
