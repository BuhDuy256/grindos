import { createHmac, timingSafeEqual } from "crypto";
import { ApiError } from "./api-error";

const ALGORITHM = "HS256";
const EXPIRE_DAYS = 30;

interface TokenPayload {
  sub: string;
  is_admin: boolean;
  exp: number;
}

function getJwtSecret() {
  return process.env.JWT_SECRET ?? "grindos-dev-secret-change-in-prod";
}

function base64UrlEncode(input: Buffer | string) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64UrlDecode(input: string) {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (normalized.length % 4)) % 4);
  return Buffer.from(normalized + padding, "base64").toString("utf8");
}

function sign(content: string) {
  return base64UrlEncode(
    createHmac("sha256", getJwtSecret()).update(content).digest(),
  );
}

export function createToken(userId: number, isAdmin: boolean): string {
  const header = base64UrlEncode(JSON.stringify({ alg: ALGORITHM, typ: "JWT" }));
  const exp = Math.floor(Date.now() / 1000) + EXPIRE_DAYS * 24 * 60 * 60;
  const payload = base64UrlEncode(JSON.stringify({
    sub: String(userId),
    is_admin: isAdmin,
    exp,
  }));
  const signature = sign(`${header}.${payload}`);

  return `${header}.${payload}.${signature}`;
}

export function decodeToken(token: string): TokenPayload {
  const [header, payload, signature] = token.split(".");
  if (!header || !payload || !signature) {
    throw new ApiError(401, "Invalid or expired token");
  }

  const expected = Buffer.from(sign(`${header}.${payload}`));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    throw new ApiError(401, "Invalid or expired token");
  }

  try {
    const decodedHeader = JSON.parse(base64UrlDecode(header)) as { alg?: string };
    if (decodedHeader.alg !== ALGORITHM) {
      throw new ApiError(401, "Invalid or expired token");
    }

    const decodedPayload = JSON.parse(base64UrlDecode(payload)) as TokenPayload;
    if (!decodedPayload.sub || decodedPayload.exp < Math.floor(Date.now() / 1000)) {
      throw new ApiError(401, "Invalid or expired token");
    }

    return decodedPayload;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(401, "Invalid or expired token");
  }
}

export function getBearerToken(request: Request): string {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    throw new ApiError(401, "Not authenticated");
  }

  return authorization.slice("Bearer ".length);
}
