import { NextResponse } from "next/server";
import { apiErrorResponse, readJson } from "@/lib/api-error";
import { loginSchema } from "@/modules/users/schema";
import { loginUser } from "@/modules/users/service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = loginSchema.parse(await readJson(request));
    const result = await loginUser(body);
    return NextResponse.json(result);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
