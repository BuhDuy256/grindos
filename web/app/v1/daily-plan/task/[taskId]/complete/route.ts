import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-error";
import { parseApiId } from "@/lib/id";
import { toggleTaskComplete } from "@/modules/daily-plan/service";

export const runtime = "nodejs";

export async function PATCH(
  _request: Request,
  context: { params: Promise<{ taskId: string }> },
) {
  try {
    const { taskId } = await context.params;
    const result = await toggleTaskComplete(parseApiId(taskId, "task_id"));
    return NextResponse.json(result);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
