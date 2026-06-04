import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-error";
import { parseApiId } from "@/lib/id";
import { playerQuerySchema } from "@/modules/daily-plan/schema";
import { getSidebarSummary } from "@/modules/shell/sidebar-summary.service";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const searchParams = new URL(request.url).searchParams;
    const query = playerQuerySchema.parse({
      user_id: searchParams.get("user_id") ?? "",
    });
    const result = await getSidebarSummary(parseApiId(query.user_id, "user_id"));
    return NextResponse.json(result);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
