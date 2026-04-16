import type { H3Event } from "h3";
import type { AuthSession } from "~/types/auth";
import { authSessionFromAccessToken } from "~/server/utils/auth-service";

function unauthorized(message: string): never {
  throw createError({ statusCode: 401, statusMessage: message });
}

function forbidden(message: string): never {
  throw createError({ statusCode: 403, statusMessage: message });
}

export async function requireSession(event: H3Event): Promise<AuthSession> {
  const { authCookie } = useRuntimeConfig();
  const token = getCookie(event, authCookie ?? "avelom_at");
  if (!token) unauthorized("Nicht angemeldet");

  const session = await authSessionFromAccessToken(token);
  if (!session) unauthorized("Sitzung ungültig");
  return session;
}

export async function requireSuperadmin(event: H3Event): Promise<AuthSession> {
  const session = await requireSession(event);
  if (!session.user.isSuperadmin) {
    forbidden("Nur für Superadmin");
  }
  return session;
}
