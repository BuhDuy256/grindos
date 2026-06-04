import { NextResponse } from "next/server";
import { apiErrorResponse, readJson } from "@/lib/api-error";
import { parseApiId } from "@/lib/id";
import { getPlayerStats, updatePlayerStats } from "@/modules/player-stats/service";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  context: { params: Promise<{ userId: string }> },
) {
  try {
    const { userId: raw } = await context.params;
    const userId = parseApiId(raw, "userId");
    const stats = await getPlayerStats(userId);
    return NextResponse.json(stats);
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ userId: string }> },
) {
  try {
    const { userId: raw } = await context.params;
    const userId = parseApiId(raw, "userId");
    const body = await readJson(req);
    await updatePlayerStats(userId, body as Parameters<typeof updatePlayerStats>[1]);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
