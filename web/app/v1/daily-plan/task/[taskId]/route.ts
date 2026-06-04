import { NextResponse } from "next/server";
import { apiErrorResponse, readJson } from "@/lib/api-error";
import { parseApiId } from "@/lib/id";
import { updateTaskSchema } from "@/modules/daily-plan/schema";
import { deleteTask, updateTask } from "@/modules/daily-plan/service";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ taskId: string }> },
) {
  try {
    const { taskId } = await context.params;
    const body = updateTaskSchema.parse(await readJson(request));
    const result = await updateTask(parseApiId(taskId, "task_id"), {
      title: body.title,
      durationMins: body.duration_mins,
    });

    return NextResponse.json(result);
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ taskId: string }> },
) {
  try {
    const { taskId } = await context.params;
    const result = await deleteTask(parseApiId(taskId, "task_id"));
    return NextResponse.json(result);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
