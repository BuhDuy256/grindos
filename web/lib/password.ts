import { createHash, timingSafeEqual } from "crypto";

export function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

export function verifyPassword(password: string, hashed: string): boolean {
  const expected = Buffer.from(hashPassword(password));
  const actual = Buffer.from(hashed);

  if (expected.length !== actual.length) {
    return false;
  }

  return timingSafeEqual(expected, actual);
}
