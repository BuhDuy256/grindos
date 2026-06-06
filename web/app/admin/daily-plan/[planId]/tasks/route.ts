import { NextResponse } from "next/server";
import { apiErrorResponse, readJson } from "@/lib/api-error";
import { parseApiId } from "@/lib/id";
import { addAiTasksToPlan, getPlanTasksFlat, getPlanTasksTree } from "@/modules/daily-plan/service";

export const runtime = "nodejs";

export async function POST(
  req: Request,
  context: { params: Promise<{ planId: string }> },
) {
  try {
    const { planId: raw } = await context.params;
    const planId = parseApiId(raw, "planId");
    const body = (await readJson(req)) as { tasks: Record<string, unknown>[] };

    // Normalize snake_case (from AI Core Python) → camelCase (TypeScript)
    const tasks = body.tasks.map((t) => ({
      title: t.title as string,
      description: (t.description ?? null) as string | null,
      durationMins: (t.duration_mins ?? t.durationMins) as number,
      parentId: (t.parent_id ?? t.parentId ?? null) as number | null,
      originType: (t.origin_type ?? t.originType ?? "SYSTEM_GENERATED") as string,
      modificationState: (t.modification_state ?? t.modificationState ?? "UNCHANGED") as string,
    }));

    await addAiTasksToPlan(planId, tasks);
    return NextResponse.json({ ok: true, count: tasks.length });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

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
