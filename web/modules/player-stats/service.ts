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

export async function resetPlayerStats(userId: number) {
  const ok = await playerStatsRepository.resetForUser(userId);
  if (!ok) {
    throw new ApiError(404, "User not found");
  }
}
