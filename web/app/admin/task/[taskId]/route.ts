import { NextResponse } from "next/server";
import { apiErrorResponse, readJson } from "@/lib/api-error";
import { parseApiId } from "@/lib/id";
import { updateTaskModification } from "@/modules/daily-plan/service";

export const runtime = "nodejs";

export async function PATCH(
  req: Request,
  context: { params: Promise<{ taskId: string }> },
) {
  try {
    const { taskId: raw } = await context.params;
    const taskId = parseApiId(raw, "taskId");
    const body = (await readJson(req)) as { modification_state: string; duration_mins?: number };
    const result = await updateTaskModification(taskId, body.modification_state, body.duration_mins);
    return NextResponse.json(result);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
