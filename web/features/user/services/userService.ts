import { apiClient } from "@/lib/api-client";
import type { UserSummary } from "../types";

export async function fetchUsers() {
  return apiClient.get<UserSummary[]>("/admin/users");
}
