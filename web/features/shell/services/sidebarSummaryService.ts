import { apiClient } from "@/lib/api-client";
import type { ShellSidebarSummary } from "../types";

const CACHE_PREFIX = "grindos_shell_sidebar_summary";

interface SidebarSummaryCacheRecord {
  cachedForDate: string;
  data: ShellSidebarSummary;
}

function cacheKey(userId: string, date: string) {
  return `${CACHE_PREFIX}:${userId}:${date}`;
}

function isBrowser() {
  return typeof window !== "undefined";
}

export function readCachedSidebarSummary(userId: string, date: string) {
  if (!isBrowser()) {
    return undefined;
  }

  const raw = localStorage.getItem(cacheKey(userId, date));
  if (!raw) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(raw) as SidebarSummaryCacheRecord;
    if (parsed.cachedForDate !== date || parsed.data.user_id !== userId) {
      return undefined;
    }
    return parsed.data;
  } catch {
    localStorage.removeItem(cacheKey(userId, date));
    return undefined;
  }
}

export function writeCachedSidebarSummary(
  userId: string,
  date: string,
  data: ShellSidebarSummary,
) {
  if (!isBrowser()) {
    return;
  }

  localStorage.setItem(
    cacheKey(userId, date),
    JSON.stringify({
      cachedForDate: date,
      data,
    } satisfies SidebarSummaryCacheRecord),
  );
}

export function clearSidebarSummaryCache(userId?: string) {
  if (!isBrowser()) {
    return;
  }

  const prefix = userId ? `${CACHE_PREFIX}:${userId}:` : `${CACHE_PREFIX}:`;
  for (let index = localStorage.length - 1; index >= 0; index -= 1) {
    const key = localStorage.key(index);
    if (key?.startsWith(prefix)) {
      localStorage.removeItem(key);
    }
  }
}

function unwrapApiResult<T>(result: { data: T | null; error: string | null }): T {
  if (result.error || !result.data) {
    throw new Error(result.error ?? "Request failed");
  }

  return result.data;
}

export async function fetchSidebarSummary(userId: string, date: string) {
  const cached = readCachedSidebarSummary(userId, date);
  if (cached) {
    return cached;
  }

  const summary = unwrapApiResult(
    await apiClient.get<ShellSidebarSummary>(
      `/v1/shell/sidebar-summary?user_id=${userId}`,
    ),
  );
  writeCachedSidebarSummary(userId, date, summary);
  return summary;
}
