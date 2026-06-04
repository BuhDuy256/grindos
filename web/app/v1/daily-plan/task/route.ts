import { NextResponse } from "next/server";
import { apiErrorResponse, readJson } from "@/lib/api-error";
import { parseApiId } from "@/lib/id";
import { createTaskSchema } from "@/modules/daily-plan/schema";
import { createTask, toggleTaskComplete } from "@/modules/daily-plan/service";
import { z } from "zod";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = createTaskSchema.parse(await readJson(request));
    const result = await createTask({
      planId: parseApiId(body.plan_id, "plan_id"),
      parentId: body.parent_id ? parseApiId(body.parent_id, "parent_id") : null,
      title: body.title,
      durationMins: body.duration_mins,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

const toggleTaskSchema = z.object({
  task_id: z.string().trim().min(1),
});

export async function PATCH(request: Request) {
  try {
    const body = toggleTaskSchema.parse(await readJson(request));
    const result = await toggleTaskComplete(parseApiId(body.task_id, "task_id"));
    return NextResponse.json(result);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
