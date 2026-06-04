import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-error";
import { parseApiId } from "@/lib/id";
import { proxyAiCore } from "@/lib/ai-core-proxy";
import { resetPlayerStats } from "@/modules/player-stats/service";
import { resetUserPlans } from "@/modules/daily-plan/service";
import { ensureUserExists } from "@/modules/users/service";

export const runtime = "nodejs";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ userId: string }> },
) {
  try {
    const { userId: userIdParam } = await context.params;
    const userId = parseApiId(userIdParam, "user_id");
    await ensureUserExists(userId);

    await Promise.all([
      resetUserPlans(userId),
      resetPlayerStats(userId),
      proxyAiCore("DELETE", `/dev/user/${userId}/reset`).catch(() => null),
    ]);

    return NextResponse.json({ status: "ok", message: `User ${userId} reset to Day 1.` });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
