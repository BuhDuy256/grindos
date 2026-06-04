import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-error";
import { parseApiId } from "@/lib/id";
import { ecrHistoryQuerySchema } from "@/modules/daily-plan/schema";
import { getEcrHistory } from "@/modules/daily-plan/service";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const searchParams = new URL(request.url).searchParams;
    const query = ecrHistoryQuerySchema.parse({
      user_id: searchParams.get("user_id") ?? "",
      days: searchParams.get("days") ?? undefined,
    });
    const result = await getEcrHistory(parseApiId(query.user_id, "user_id"), query.days);
    return NextResponse.json(result);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
