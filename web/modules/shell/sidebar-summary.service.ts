import { ApiError } from "@/lib/api-error";
import { toApiId } from "@/lib/id";
import { playerStatsRepository } from "@/modules/player-stats/mongo.repository";
import { userRepository } from "@/modules/users/mongo.repository";

export interface SidebarSummaryDTO {
  user_id: string;
  main_goal: string;
  streak: number;
  goal_updated_at: string;
}

export async function getSidebarSummary(userId: number): Promise<SidebarSummaryDTO> {
  const [context, stats] = await Promise.all([
    userRepository.findAiContext(userId),
    playerStatsRepository.findByUserId(userId),
  ]);

  if (!context) {
    throw new ApiError(404, "AI context not found");
  }

  if (!stats) {
    throw new ApiError(404, "Player stats not found");
  }

  return {
    user_id: toApiId(userId),
    main_goal: context.mainGoal,
    streak: stats.streak,
    goal_updated_at: context.updatedAt.toISOString(),
  };
}
