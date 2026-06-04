"use client";

import { useQuery } from "@tanstack/react-query";
import { dailyPlanOptions } from "../queries/dailyPlanOptions";
import type { Task } from "../types";

export interface DailyPlanProgress {
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  progressPercent: number;
}

export function calculateDailyPlanProgress(tasks: Task[]): DailyPlanProgress {
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((task) => task.is_completed).length;
  const progressPercent =
    totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

  return {
    totalTasks,
    completedTasks,
    pendingTasks: totalTasks - completedTasks,
    progressPercent,
  };
}

export function getProgressForTaskState(tasks: Task[], taskId: string, isCompleted: boolean) {
  return calculateDailyPlanProgress(
    tasks.map((task) => (
      task.id === taskId ? { ...task, is_completed: isCompleted } : task
    )),
  );
}

export function useDailyPlanProgress(userId: string, date: string): DailyPlanProgress {
  const { data } = useQuery(dailyPlanOptions(userId, date));

  return calculateDailyPlanProgress(data?.tasks ?? []);
}
