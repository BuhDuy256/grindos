import { NextResponse } from "next/server";
import { apiErrorResponse, readJson } from "@/lib/api-error";
import { parseApiId } from "@/lib/id";
import { proxyAiCore } from "@/lib/ai-core-proxy";
import { onboardSchema } from "@/modules/users/schema";

export const runtime = "nodejs";

// User-facing forge endpoint — does not require admin.
// Called once during onboarding after /auth/register.
// AI Core handles context creation (including arc_start_date) — no double-write here.
export async function POST(request: Request) {
  try {
    const body = onboardSchema.parse(await readJson(request));
    const userId = body.user_id ? parseApiId(body.user_id, "user_id") : undefined;
    const result = await proxyAiCore("POST", "/v1/onboarding/forge", {
      ...body,
      user_id: userId,
    });
    return NextResponse.json(result);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
