import { NextResponse } from "next/server";
import { apiErrorResponse, readJson } from "@/lib/api-error";
import { registerInternal } from "@/modules/users/service";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = (await readJson(req)) as { username: string; timezone: string };
    const result = await registerInternal(body.username, body.timezone ?? "UTC");
    return NextResponse.json(result);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
