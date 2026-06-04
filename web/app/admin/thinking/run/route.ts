import { NextResponse } from "next/server";
import { apiErrorResponse, readJson } from "@/lib/api-error";
import { parseApiId } from "@/lib/id";
import { proxyAiCore } from "@/lib/ai-core-proxy";
import { runPipelineSchema } from "@/modules/users/schema";
import { ensureUserExists } from "@/modules/users/service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = runPipelineSchema.parse(await readJson(request));
    const userId = parseApiId(body.user_id, "user_id");
    await ensureUserExists(userId);

    const result = await proxyAiCore("POST", "/dev/thinking/run-for-user", {
      user_id: userId,
      date: body.date ?? undefined,
    });
    return NextResponse.json(result);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
