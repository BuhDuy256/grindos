import { ApiError } from "@/lib/api-error";
import { mapPlayerStatsToDTO } from "./mapper";
import { playerStatsRepository } from "./mongo.repository";

export async function getPlayerStats(userId: number) {
  const stats = await playerStatsRepository.findByUserId(userId);
  if (!stats) {
    throw new ApiError(404, "Player not found");
  }

  return mapPlayerStatsToDTO(stats);
}

export async function createDefaultPlayerStats(userId: number) {
  return playerStatsRepository.createDefault(userId);
}

export async function updatePlayerStats(userId: number, fields: {
  level?: number; exp?: number; str_stat?: number; int_stat?: number;
  vit_stat?: number; streak?: number; difficulty_multiplier?: number;
}) {
  await playerStatsRepository.updateStats(userId, {
    level: fields.level,
    exp: fields.exp,
    strStat: fields.str_stat,
    intStat: fields.int_stat,
    vitStat: fields.vit_stat,
    streak: fields.streak,
    difficultyMultiplier: fields.difficulty_multiplier,
  });
}

export async function resetPlayerStats(userId: number) {
  const ok = await playerStatsRepository.resetForUser(userId);
  if (!ok) {
    throw new ApiError(404, "User not found");
  }
}
