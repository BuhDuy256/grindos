import { apiClient } from "@/lib/api-client";
import type { EcrHistoryResponse, PlayerProfileResponse, Stats } from "../types";

function unwrapApiResult<T>(result: { data: T | null; error: string | null }): T {
  if (result.error || !result.data) {
    throw new Error(result.error ?? "Request failed");
  }

  return result.data;
}

function normalizeProfileResponse(response: PlayerProfileResponse): Stats {
  const stats = response.stats ?? response;

  return {
    user_id: response.user_id,
    level: stats.level,
    exp: stats.exp,
    str_stat: stats.str_stat,
    int_stat: stats.int_stat,
    vit_stat: stats.vit_stat,
    streak: stats.streak,
    difficulty_multiplier: stats.difficulty_multiplier,
  };
}

export async function fetchStats(userId: string) {
  return normalizeProfileResponse(
    unwrapApiResult(
      await apiClient.get<PlayerProfileResponse>(`/v1/player/profile?user_id=${userId}`),
    ),
  );
}

export async function fetchEcrHistory(userId: string, days = 365) {
  return unwrapApiResult(
    await apiClient.get<EcrHistoryResponse>(
      `/v1/player/ecr-history?user_id=${userId}&days=${days}`,
    ),
  ).history;
}
