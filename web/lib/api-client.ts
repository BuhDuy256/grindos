import { getToken } from "./auth";

const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");

type ApiOk<T> = { data: T; error: null };
type ApiErr = { data: null; error: string };
type ApiResult<T> = ApiOk<T> | ApiErr;

async function readErrorMessage(res: Response): Promise<string> {
  const contentType = res.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const body = (await res.json().catch(() => null)) as
      | { detail?: unknown; message?: unknown; error?: unknown }
      | null;
    const detail = body?.detail ?? body?.message ?? body?.error;
    if (typeof detail === "string" && detail.trim()) {
      return detail;
    }
  }

  const text = await res.text().catch(() => "");
  return text || res.statusText || "Request failed";
}

async function apiFetch<T>(
  path: string,
  options?: RequestInit,
): Promise<ApiResult<T>> {
  const token = getToken();
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options?.headers,
      },
    });

    if (!res.ok) {
      return { data: null, error: await readErrorMessage(res) };
    }

    const data: T = await res.json();
    return { data, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}

export const apiClient = {
  get: <T>(path: string) => apiFetch<T>(path),
  post: <T>(path: string, body: unknown) =>
    apiFetch<T>(path, { method: "POST", body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    apiFetch<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: <T>(path: string) => apiFetch<T>(path, { method: "DELETE" }),
};
