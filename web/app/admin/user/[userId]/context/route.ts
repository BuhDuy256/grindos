import { NextResponse } from "next/server";
import { apiErrorResponse, readJson } from "@/lib/api-error";
import { parseApiId } from "@/lib/id";
import { createAiContext, getAiContext, patchAiContext } from "@/modules/users/service";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  context: { params: Promise<{ userId: string }> },
) {
  try {
    const { userId: raw } = await context.params;
    const userId = parseApiId(raw, "userId");
    const ctx = await getAiContext(userId);
    if (!ctx) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(ctx);
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(
  req: Request,
  context: { params: Promise<{ userId: string }> },
) {
  try {
    const { userId: raw } = await context.params;
    const userId = parseApiId(raw, "userId");
    const body = (await readJson(req)) as { main_goal: string; metadata: Record<string, unknown> };
    const result = await createAiContext(userId, body.main_goal, body.metadata);
    return NextResponse.json(result);
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
    const result = await patchAiContext(userId, body as Parameters<typeof patchAiContext>[1]);
    return NextResponse.json(result);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
