import { NextResponse } from "next/server";
import { apiErrorResponse, readJson } from "@/lib/api-error";
import { parseApiId } from "@/lib/id";
import { createDailyPlanSchema, getDailyPlanQuerySchema } from "@/modules/daily-plan/schema";
import { ensureDailyPlan, getDailyPlan } from "@/modules/daily-plan/service";

export const runtime = "nodejs";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export async function GET(request: Request) {
  try {
    const searchParams = new URL(request.url).searchParams;
    const query = getDailyPlanQuerySchema.parse({
      user_id: searchParams.get("user_id") ?? "",
      date: searchParams.get("date") ?? undefined,
    });
    const result = await getDailyPlan(
      parseApiId(query.user_id, "user_id"),
      query.date ?? todayISO(),
    );

    return NextResponse.json(result);
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = createDailyPlanSchema.parse(await readJson(request));
    const result = await ensureDailyPlan(
      parseApiId(body.user_id, "user_id"),
      body.date ?? todayISO(),
    );

    return NextResponse.json(result);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
