import { queryOptions } from "@tanstack/react-query";
import { getDailyPlanOrCreate } from "../services/dailyPlanService";
import { dailyPlanKeys } from "./dailyPlanKeys";

export function dailyPlanOptions(userId: string, date: string) {
  return queryOptions({
    queryKey: dailyPlanKeys.detail(userId, date),
    queryFn: () => getDailyPlanOrCreate(userId, date),
    staleTime: 3 * 60 * 1000,
    gcTime: 45 * 60 * 1000,
  });
}
