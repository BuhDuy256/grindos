export const sidebarSummaryKeys = {
  detail: (userId: string, date: string) => ["shell-sidebar-summary", userId, date] as const,
};
