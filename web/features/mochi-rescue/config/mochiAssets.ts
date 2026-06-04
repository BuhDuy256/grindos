import type { MochiEffectType, MochiStage } from "../types";

export const MOCHI_BASE_ASSETS: Record<MochiStage, string> = {
  trapped: "/len-cat.webp",
  struggling: "/task1-completed.webp",
  "almost-free": "/cat.webp",
  rescued: "/cat.webp",
};

export const MOCHI_EFFECT_ASSETS: Record<MochiEffectType, string> = {
  TASK_COMPLETED: "/task1-completed.webp",
  TASK_UNCOMPLETED: "/len-cat.webp",
  STAGE_ADVANCED: "/task1-completed.webp",
  STAGE_REVERSED: "/len-cat.webp",
  ALL_TASKS_COMPLETED: "/cat.webp",
  ROLLBACK: "/len-cat.webp",
};

export function getMochiAsset(stage: MochiStage, effectType?: MochiEffectType) {
  return effectType ? MOCHI_EFFECT_ASSETS[effectType] : MOCHI_BASE_ASSETS[stage];
}
