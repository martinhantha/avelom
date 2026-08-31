import type { H3Event } from "h3";
import type { AuthSession, AuthTokens } from "~/types/auth";
import { ACCESS_TTL_SEC, REFRESH_TTL_SEC } from "./jwt";
import { authSessionFromAccessToken, refreshTokens } from "./auth-service";

function accessCookieName(): string {
  return useRuntimeConfig().authCookie ?? "alpiplan_at";
}

function refreshCookieName(): string {
  return `${accessCookieName()}_rt`;
}

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge,
    secure: process.env.NODE_ENV === "production",
  };
}

export function setAuthCookies(event: H3Event, tokens: AuthTokens): void {
  setCookie(event, accessCookieName(), tokens.accessToken, cookieOptions(tokens.expiresIn ?? ACCESS_TTL_SEC));
  setCookie(event, refreshCookieName(), tokens.refreshToken, cookieOptions(REFRESH_TTL_SEC));
}

export function clearAuthCookies(event: H3Event): void {
  deleteCookie(event, accessCookieName(), { path: "/" });
  deleteCookie(event, refreshCookieName(), { path: "/" });
}

/** Restore session from access cookie, or silently rotate via refresh cookie. */
export async function restoreCookieSession(event: H3Event): Promise<AuthSession | null> {
  const accessToken = getCookie(event, accessCookieName());
  if (accessToken) {
    const session = await authSessionFromAccessToken(accessToken);
    if (session) return session;
  }

  const refreshToken = getCookie(event, refreshCookieName());
  if (!refreshToken) {
    if (accessToken) clearAuthCookies(event);
    return null;
  }

  const tokens = await refreshTokens(refreshToken);
  if (!tokens) {
    clearAuthCookies(event);
    return null;
  }

  setAuthCookies(event, tokens);
  return authSessionFromAccessToken(tokens.accessToken);
}
