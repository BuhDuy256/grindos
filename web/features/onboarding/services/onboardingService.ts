import { apiClient } from "@/lib/api-client";
import type { OnboardResult } from "../types";

export function forgeOnboarding(input: {
  userId: string;
  mainGoal: string;
  userContext: string;
}) {
  return apiClient.post<OnboardResult>("/v1/onboarding/forge", {
    user_id: input.userId,
    main_goal: input.mainGoal,
    user_context: input.userContext,
  });
}
