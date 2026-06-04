import { NextResponse } from "next/server";
import { apiErrorResponse, readJson } from "@/lib/api-error";
import { parseApiId } from "@/lib/id";
import { updatePlan } from "@/modules/daily-plan/service";

export const runtime = "nodejs";

export async function PATCH(
  req: Request,
  context: { params: Promise<{ planId: string }> },
) {
  try {
    const { planId: raw } = await context.params;
    const planId = parseApiId(raw, "planId");
    const body = await readJson(req);
    const result = await updatePlan(planId, body as Parameters<typeof updatePlan>[1]);
    return NextResponse.json(result);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
