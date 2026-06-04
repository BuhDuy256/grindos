"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { addDays } from "../date";
import { dailyPlanOptions } from "../queries/dailyPlanOptions";

export { addDays };

export function useDailyPlan(userId: string, date: string) {
  const queryClient = useQueryClient();
  const query = useQuery(dailyPlanOptions(userId, date));

  useEffect(() => {
    if (!query.data) {
      return;
    }

    void queryClient.prefetchQuery(dailyPlanOptions(userId, addDays(date, -1)));
    void queryClient.prefetchQuery(dailyPlanOptions(userId, addDays(date, 1)));
  }, [date, query.data, queryClient, userId]);

  return {
    plan: query.data ?? null,
    isPending: query.isPending,
    isFetching: query.isFetching,
    error: query.error,
  };
}
