import { NextResponse } from "next/server";
import { apiErrorResponse, readJson } from "@/lib/api-error";
import { markTasksCompleted } from "@/modules/daily-plan/service";

export const runtime = "nodejs";

export async function PATCH(req: Request) {
  try {
    const body = (await readJson(req)) as { task_ids: number[] };
    const result = await markTasksCompleted(body.task_ids ?? []);
    return NextResponse.json(result);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
