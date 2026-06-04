import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-error";
import { getAdminDailyPlan } from "@/modules/daily-plan/service";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const params = new URL(req.url).searchParams;
    const userId = parseInt(params.get("user_id") ?? "");
    const date = params.get("date") ?? "";
    if (!userId || !date) return NextResponse.json({ error: "user_id and date required" }, { status: 400 });
    const plan = await getAdminDailyPlan(userId, date);
    if (!plan) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(plan);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
