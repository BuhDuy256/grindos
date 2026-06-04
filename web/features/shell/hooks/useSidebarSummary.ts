"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { todayISO } from "@/features/daily-plan/date";
import { sidebarSummaryOptions } from "../queries/sidebarSummaryOptions";

function msUntilNextLocalDay() {
  const now = new Date();
  const nextDay = new Date(now);
  nextDay.setHours(24, 0, 0, 0);
  return Math.max(nextDay.getTime() - now.getTime(), 60 * 1000);
}

export function useSidebarSummary(userId?: string) {
  const [date, setDate] = useState(() => todayISO());

  useEffect(() => {
    const id = window.setTimeout(() => {
      setDate(todayISO());
    }, msUntilNextLocalDay() + 1000);

    return () => window.clearTimeout(id);
  }, [date]);

  const query = useQuery({
    ...sidebarSummaryOptions(userId ?? "anonymous", date),
    enabled: Boolean(userId),
  });

  return {
    summary: query.data ?? null,
    isPending: query.isPending,
    isFetching: query.isFetching,
    error: query.error,
  };
}
