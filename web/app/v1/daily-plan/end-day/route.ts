import { NextResponse } from "next/server";
import { apiErrorResponse, readJson } from "@/lib/api-error";
import { parseApiId } from "@/lib/id";
import { endDaySchema } from "@/modules/daily-plan/schema";
import { saveEndDayNote } from "@/modules/daily-plan/service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = endDaySchema.parse(await readJson(request));
    const result = await saveEndDayNote(
      parseApiId(body.user_id, "user_id"),
      body.date,
      body.user_note,
    );

    return NextResponse.json(result);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
