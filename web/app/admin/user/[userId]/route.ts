import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-error";
import { parseApiId } from "@/lib/id";
import { ensureUserExists } from "@/modules/users/service";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  context: { params: Promise<{ userId: string }> },
) {
  try {
    const { userId: raw } = await context.params;
    const userId = parseApiId(raw, "userId");
    const user = await ensureUserExists(userId);
    return NextResponse.json({
      id: user.id,
      username: user.username,
      timezone: user.timezone,
      is_admin: user.isAdmin,
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
