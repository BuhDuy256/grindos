"use client";

import { useDailyPlanProgress } from "@/features/daily-plan/hooks/useDailyPlanProgress";
import { getMochiStage } from "../utils/getMochiStage";

export function useMochiStage(userId: string, date: string) {
  const progress = useDailyPlanProgress(userId, date);
  const stage = getMochiStage(progress.progressPercent);

  return {
    ...progress,
    stage,
  };
}
