import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-error";
import { parseApiId } from "@/lib/id";
import { getPlanTasksFlat, getPlanTasksTree } from "@/modules/daily-plan/service";

export const runtime = "nodejs";

export async function GET(
  req: Request,
  context: { params: Promise<{ planId: string }> },
) {
  try {
    const { planId: raw } = await context.params;
    const planId = parseApiId(raw, "planId");
    const format = new URL(req.url).searchParams.get("format") ?? "flat";
    const tasks = format === "tree"
      ? await getPlanTasksTree(planId)
      : await getPlanTasksFlat(planId);
    return NextResponse.json(tasks);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
