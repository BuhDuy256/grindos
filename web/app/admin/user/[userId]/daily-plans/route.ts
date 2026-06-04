import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-error";
import { parseApiId } from "@/lib/id";
import { getLastNPlans } from "@/modules/daily-plan/service";

export const runtime = "nodejs";

export async function GET(
  req: Request,
  context: { params: Promise<{ userId: string }> },
) {
  try {
    const { userId: raw } = await context.params;
    const userId = parseApiId(raw, "userId");
    const limit = parseInt(new URL(req.url).searchParams.get("limit") ?? "30");
    const plans = await getLastNPlans(userId, limit);
    return NextResponse.json(plans);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
