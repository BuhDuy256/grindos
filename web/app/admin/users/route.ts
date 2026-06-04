import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-error";
import { listUsers } from "@/modules/users/service";

export const runtime = "nodejs";

export async function GET() {
  try {
    const result = await listUsers();
    return NextResponse.json(result);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
