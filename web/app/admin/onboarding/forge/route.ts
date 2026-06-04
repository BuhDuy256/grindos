import { NextResponse } from "next/server";
import { apiErrorResponse, readJson } from "@/lib/api-error";
import { parseApiId } from "@/lib/id";
import { proxyAiCore } from "@/lib/ai-core-proxy";
import { onboardSchema } from "@/modules/users/schema";
import { saveOnboardingContext } from "@/modules/users/service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = onboardSchema.parse(await readJson(request));
    const userId = body.user_id ? parseApiId(body.user_id, "user_id") : undefined;
    const result = await proxyAiCore("POST", "/v1/onboarding/forge", {
      ...body,
      user_id: userId,
    });

    if (userId && result?.active_arc) {
      await saveOnboardingContext(userId, body.main_goal, result.active_arc);
    }

    return NextResponse.json(result);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
