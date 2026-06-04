import {
  AUTH_COOKIE_MAX_AGE,
  ONBOARDED_KEY,
  TOKEN_KEY,
  USER_KEY,
} from "./auth-constants";

export interface AuthUser {
  id: string;
  username: string;
  is_admin: boolean;
}

interface AuthOptions {
  isOnboarded?: boolean;
}

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;

  const cookie = document.cookie
    .split("; ")
    .find((part) => part.startsWith(`${name}=`));

  return cookie ? decodeURIComponent(cookie.split("=").slice(1).join("=")) : null;
}

function setCookie(name: string, value: string, maxAge: number): void {
  if (typeof document === "undefined") return;

  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`;
}

function deleteCookie(name: string): void {
  setCookie(name, "", 0);
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return getCookie(TOKEN_KEY) ?? localStorage.getItem(TOKEN_KEY);
}

export function getUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function setAuth(token: string, user: AuthUser, options: AuthOptions = {}): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  localStorage.setItem(ONBOARDED_KEY, String(options.isOnboarded ?? false));
  setCookie(TOKEN_KEY, token, AUTH_COOKIE_MAX_AGE);
  setCookie(ONBOARDED_KEY, String(options.isOnboarded ?? false), AUTH_COOKIE_MAX_AGE);
}

export function clearAuth(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(ONBOARDED_KEY);
  deleteCookie(TOKEN_KEY);
  deleteCookie(ONBOARDED_KEY);
}
