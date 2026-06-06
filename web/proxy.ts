import { NextRequest, NextResponse } from "next/server";
import { ONBOARDED_KEY, TOKEN_KEY } from "./lib/auth-constants";

interface AuthPayload {
  sub: string;
  is_admin: boolean;
  exp: number;
}

interface RequestToken {
  value: string;
}

const PUBLIC_PAGES = new Set(["/login", "/register"]);
const PUBLIC_API_PATHS = new Set(["/auth/login", "/auth/register"]);
const PROTECTED_PAGES = new Set(["/daily-plan", "/stats", "/profile", "/onboarding"]);
const DEFAULT_AUTHENTICATED_PATH = "/daily-plan";
const DEFAULT_UNAUTHENTICATED_PATH = "/login";

function getJwtSecret() {
  return process.env.JWT_SECRET ?? "grindos-dev-secret-change-in-prod";
}

function base64UrlToBytes(input: string) {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function decodeBase64UrlJson<T>(input: string): T {
  const json = new TextDecoder().decode(base64UrlToBytes(input));
  return JSON.parse(json) as T;
}

async function verifyToken(token: string): Promise<AuthPayload | null> {
  const [header, payload, signature] = token.split(".");
  if (!header || !payload || !signature) {
    return null;
  }

  try {
    const decodedHeader = decodeBase64UrlJson<{ alg?: string }>(header);
    if (decodedHeader.alg !== "HS256") {
      return null;
    }

    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(getJwtSecret()),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"],
    );
    const validSignature = await crypto.subtle.verify(
      "HMAC",
      key,
      base64UrlToBytes(signature),
      new TextEncoder().encode(`${header}.${payload}`),
    );
    if (!validSignature) {
      return null;
    }

    const decodedPayload = decodeBase64UrlJson<AuthPayload>(payload);
    if (
      !decodedPayload.sub ||
      typeof decodedPayload.exp !== "number" ||
      decodedPayload.exp < Math.floor(Date.now() / 1000)
    ) {
      return null;
    }

    return decodedPayload;
  } catch {
    return null;
  }
}

function redirect(request: NextRequest, pathname: string) {
  return NextResponse.redirect(new URL(pathname, request.url));
}

function authJson(status: number, detail: string) {
  return NextResponse.json({ detail }, { status });
}

function clearAuthCookies(response: NextResponse) {
  response.cookies.delete(TOKEN_KEY);
  response.cookies.delete(ONBOARDED_KEY);
  return response;
}

function getRequestToken(request: NextRequest): RequestToken | null {
  const cookieToken = request.cookies.get(TOKEN_KEY)?.value;
  if (cookieToken) {
    return { value: cookieToken };
  }

  const authorization = request.headers.get("authorization");
  if (authorization?.startsWith("Bearer ")) {
    return {
      value: authorization.slice("Bearer ".length),
    };
  }

  return null;
}

function nextWithAuthHeader(request: NextRequest, token: RequestToken | null) {
  if (!token) {
    return NextResponse.next();
  }

  const headers = new Headers(request.headers);
  if (!headers.has("authorization")) {
    headers.set("authorization", `Bearer ${token.value}`);
  }

  return NextResponse.next({
    request: { headers },
  });
}

function isApiPath(pathname: string) {
  return (
    pathname.startsWith("/v1/") ||
    pathname.startsWith("/auth/") ||
    (pathname.startsWith("/admin/") && pathname !== "/admin")
  );
}

function isPublicApiPath(pathname: string) {
  return PUBLIC_API_PATHS.has(pathname);
}

function isAdminOnlyPath(pathname: string) {
  if (pathname === "/admin") return true;
  if (pathname === "/v1/onboarding/forge") return false; // user-facing, no admin needed
  return pathname.startsWith("/admin/");
}

function isProtectedPage(pathname: string) {
  return PROTECTED_PAGES.has(pathname) || pathname.startsWith("/daily-plan/");
}

function authenticatedHome(request: NextRequest) {
  const isOnboarded = request.cookies.get(ONBOARDED_KEY)?.value === "true";
  return isOnboarded ? DEFAULT_AUTHENTICATED_PATH : "/onboarding";
}

function isAiCoreRequest(request: NextRequest): boolean {
  const apiKey = request.headers.get("x-api-key");
  const expected = process.env.AI_CORE_SECRET ?? "dev-secret";
  return !!apiKey && apiKey === expected;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // AI Core internal calls bypass JWT auth — authenticated via X-Api-Key header
  if (isAiCoreRequest(request)) {
    return NextResponse.next();
  }

  if (isPublicApiPath(pathname)) {
    return NextResponse.next();
  }

  const token = getRequestToken(request);
  const payload = token ? await verifyToken(token.value) : null;
  const apiPath = isApiPath(pathname);

  if (token && !payload) {
    const response = apiPath
      ? authJson(401, "Invalid or expired token")
      : redirect(request, DEFAULT_UNAUTHENTICATED_PATH);
    return clearAuthCookies(response);
  }

  if (PUBLIC_PAGES.has(pathname)) {
    if (payload) {
      return redirect(request, authenticatedHome(request));
    }
    return NextResponse.next();
  }

  const requiresAuth =
    pathname === "/" ||
    isProtectedPage(pathname) ||
    pathname === "/auth/me" ||
    pathname.startsWith("/v1/") ||
    pathname === "/admin" ||
    pathname.startsWith("/admin/");

  if (requiresAuth && !payload) {
    return apiPath
      ? authJson(401, "Not authenticated")
      : redirect(request, DEFAULT_UNAUTHENTICATED_PATH);
  }

  if (payload && isAdminOnlyPath(pathname) && !payload.is_admin) {
    return apiPath ? authJson(403, "Forbidden") : redirect(request, DEFAULT_AUTHENTICATED_PATH);
  }

  if (pathname === "/" && payload) {
    return redirect(request, authenticatedHome(request));
  }

  return nextWithAuthHeader(request, token);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
