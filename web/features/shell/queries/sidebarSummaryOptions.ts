import { queryOptions } from "@tanstack/react-query";
import { fetchSidebarSummary, readCachedSidebarSummary } from "../services/sidebarSummaryService";
import { sidebarSummaryKeys } from "./sidebarSummaryKeys";

function msUntilNextLocalDay() {
  const now = new Date();
  const nextDay = new Date(now);
  nextDay.setHours(24, 0, 0, 0);
  return Math.max(nextDay.getTime() - now.getTime(), 60 * 1000);
}

export function sidebarSummaryOptions(userId: string, date: string) {
  const staleTime = msUntilNextLocalDay();

  return queryOptions({
    queryKey: sidebarSummaryKeys.detail(userId, date),
    queryFn: () => fetchSidebarSummary(userId, date),
    initialData: () => readCachedSidebarSummary(userId, date),
    staleTime,
    gcTime: staleTime + 60 * 60 * 1000,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
  });
}
