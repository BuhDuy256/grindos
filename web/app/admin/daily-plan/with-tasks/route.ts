import { NextResponse } from "next/server";
import { apiErrorResponse, readJson } from "@/lib/api-error";
import { createPlanWithTasks } from "@/modules/daily-plan/service";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = (await readJson(req)) as {
      user_id: number; date: string;
      system_message: string; progress_analysis: string;
      tasks: { title: string; description: string | null; duration_mins: number; parent_id: number | null; origin_type: string; modification_state: string }[];
    };
    const result = await createPlanWithTasks(
      body.user_id, body.date, body.system_message, body.progress_analysis, body.tasks,
    );
    return NextResponse.json(result);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
