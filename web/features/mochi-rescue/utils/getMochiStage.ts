import type { MochiStage } from "../types";

export function getMochiStage(progressPercent: number): MochiStage {
  if (progressPercent <= 0) {
    return "trapped";
  }

  if (progressPercent < 50) {
    return "struggling";
  }

  if (progressPercent < 100) {
    return "almost-free";
  }

  return "rescued";
}

export function stageRank(stage: MochiStage) {
  const ranks: Record<MochiStage, number> = {
    trapped: 0,
    struggling: 1,
    "almost-free": 2,
    rescued: 3,
  };

  return ranks[stage];
}
