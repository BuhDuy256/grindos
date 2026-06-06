import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-error";
import { getAdminDailyPlan } from "@/modules/daily-plan/service";
import { dailyPlanRepository } from "@/modules/daily-plan/mongo.repository";

export const runtime = "nodejs";

export async function DELETE(req: Request) {
  try {
    const params = new URL(req.url).searchParams;
    const userId = parseInt(params.get("user_id") ?? "");
    const date = params.get("date") ?? "";
    if (!userId || !date) return NextResponse.json({ error: "user_id and date required" }, { status: 400 });
    const plan = await dailyPlanRepository.findPlanByUserAndDate(userId, date);
    if (plan) {
      await dailyPlanRepository.resetUserPlans(userId); // soft-delete for this date
      // Actually we only want to delete this specific plan — use direct update
      const { getMongoDb } = await import("@/lib/mongodb");
      const db = await getMongoDb();
      await db.collection("daily_plans").updateOne(
        { userId, date },
        { $set: { deletedAt: new Date(), updatedAt: new Date() } },
      );
      await db.collection("tasks").updateMany(
        { dailyPlanId: plan.id, deletedAt: null },
        { $set: { deletedAt: new Date(), modificationState: "DELETED", updatedAt: new Date() } },
      );
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

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
