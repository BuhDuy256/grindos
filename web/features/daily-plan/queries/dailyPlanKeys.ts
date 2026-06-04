export const dailyPlanKeys = {
  all: ["daily-plan"] as const,
  details: () => [...dailyPlanKeys.all, "detail"] as const,
  detail: (userId: string, date: string) => ["daily-plan", userId, date] as const,
};
