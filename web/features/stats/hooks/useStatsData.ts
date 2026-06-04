"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { fetchEcrHistory, fetchStats } from "../services/statsService";

export const statsQueryKeys = {
  profile: (userId: string) => ["player-profile", userId] as const,
  ecrHistory: (userId: string, days: number) => ["player-ecr-history", userId, days] as const,
};

export function useStatsData() {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id ?? "";
  const historyDays = 365;

  const statsQuery = useQuery({
    queryKey: statsQueryKeys.profile(userId),
    queryFn: () => fetchStats(userId),
    enabled: Boolean(userId) && !authLoading,
    staleTime: 60 * 1000,
  });

  const historyQuery = useQuery({
    queryKey: statsQueryKeys.ecrHistory(userId, historyDays),
    queryFn: () => fetchEcrHistory(userId, historyDays),
    enabled: Boolean(userId) && !authLoading,
    staleTime: 3 * 60 * 1000,
  });

  return {
    user,
    stats: statsQuery.data ?? null,
    history: historyQuery.data ?? [],
    loading: authLoading || (Boolean(userId) && (statsQuery.isPending || historyQuery.isPending)),
  };
}
