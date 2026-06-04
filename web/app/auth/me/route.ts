import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-error";
import { getBearerToken } from "@/lib/token";
import { getMe } from "@/modules/users/service";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const token = getBearerToken(request);
    const result = await getMe(token);
    return NextResponse.json(result);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
