import { ApiError } from "./api-error";

const AI_CORE_URL = process.env.AI_CORE_URL ?? "http://localhost:8000";

export async function proxyAiCore(
  method: "DELETE" | "POST",
  path: string,
  body?: unknown,
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120_000);

  try {
    const response = await fetch(`${AI_CORE_URL}${path}`, {
      method,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      const detail = typeof payload?.detail === "string"
        ? payload.detail
        : "AI Core request failed";
      throw new ApiError(response.status, detail);
    }

    return payload;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError(502, "AI Core unreachable - is it running on port 8000?");
  } finally {
    clearTimeout(timeout);
  }
}
