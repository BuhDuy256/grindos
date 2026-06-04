import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Auth not implemented yet — pass all requests through.
export function middleware(_request: NextRequest) {
  return NextResponse.next();
}
