import { NextResponse } from "next/server";
import { apiErrorResponse, readJson } from "@/lib/api-error";
import { registerSchema } from "@/modules/users/schema";
import { registerUser } from "@/modules/users/service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = registerSchema.parse(await readJson(request));
    const result = await registerUser(body);
    return NextResponse.json(result);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
