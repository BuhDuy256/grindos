"use client";

import { useMochiEffectsStore } from "@/features/mochi-rescue/store/useMochiEffectsStore";
import type { MochiEffectEvent, MochiEffectType } from "@/features/mochi-rescue/types";
import { getMochiStage, stageRank } from "@/features/mochi-rescue/utils/getMochiStage";
import {
  calculateDailyPlanProgress,
  getProgressForTaskState,
} from "../hooks/useDailyPlanProgress";
import type { DailyPlan, Task } from "../types";

function createEffectId(taskId: string) {
  return `${taskId}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getCompletionEffectType({
  isCompleted,
  fromProgress,
  fromStage,
  toProgress,
  toStage,
}: {
  isCompleted: boolean;
  fromProgress: number;
  toProgress: number;
  fromStage: MochiEffectEvent["fromStage"];
  toStage: MochiEffectEvent["toStage"];
}): MochiEffectType {
  if (toProgress === 100 && fromProgress < 100) {
    return "ALL_TASKS_COMPLETED";
  }

  if (stageRank(toStage) > stageRank(fromStage)) {
    return "STAGE_ADVANCED";
  }

  if (stageRank(toStage) < stageRank(fromStage)) {
    return "STAGE_REVERSED";
  }

  return isCompleted ? "TASK_COMPLETED" : "TASK_UNCOMPLETED";
}

export function useTaskCompletionController({
  date,
  onToggleTask,
  plan,
}: {
  date: string;
  onToggleTask: (task: Task, isCompleted: boolean) => Promise<void>;
  plan: DailyPlan;
}) {
  const enqueueEffect = useMochiEffectsStore((state) => state.enqueueEffect);

  async function toggleTask(task: Task, isCompleted: boolean) {
    const fromProgress = calculateDailyPlanProgress(plan.tasks).progressPercent;
    const toProgress = getProgressForTaskState(plan.tasks, task.id, isCompleted).progressPercent;
    const fromStage = getMochiStage(fromProgress);
    const toStage = getMochiStage(toProgress);
    const type = getCompletionEffectType({
      isCompleted,
      fromProgress,
      fromStage,
      toProgress,
      toStage,
    });

    const event: MochiEffectEvent = {
      id: createEffectId(task.id),
      type,
      date,
      taskId: task.id,
      fromProgress,
      toProgress,
      fromStage,
      toStage,
      createdAt: Date.now(),
      soundKey: type.toLowerCase(),
    };

    enqueueEffect(event);

    try {
      await onToggleTask(task, isCompleted);
    } catch (error) {
      enqueueEffect({
        id: createEffectId(task.id),
        type: "ROLLBACK",
        date,
        taskId: task.id,
        fromProgress: toProgress,
        toProgress: fromProgress,
        fromStage: toStage,
        toStage: fromStage,
        createdAt: Date.now(),
        soundKey: "rollback",
      });
      throw error;
    }
  }

  return {
    toggleTask,
  };
}
