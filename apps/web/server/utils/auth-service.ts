import bcrypt from "bcryptjs";
import type { AuthSession, AuthTokens } from "~/types/auth";
import { signAccessToken, signRefreshToken, verifyBearerToken } from "./jwt";
import { loadUserWithMemberships, toAuthSession } from "./session";
import { prisma } from "./prisma";

const ACCESS_EXPIRES_SEC = 8 * 3600;

export async function issueTokensForUser(userId: string): Promise<AuthTokens> {
  const [accessToken, refreshToken] = await Promise.all([
    signAccessToken(userId),
    signRefreshToken(userId),
  ]);
  return {
    accessToken,
    refreshToken,
    expiresIn: ACCESS_EXPIRES_SEC,
  };
}

export type LoginResult =
  | { ok: true; tokens: AuthTokens }
  | { ok: false; code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "DISABLED" };

export async function loginWithEmailPassword(email: string, password: string): Promise<LoginResult> {
  const normalized = email.trim().toLowerCase();
  if (!normalized || !password) {
    return { ok: false, code: "VALIDATION_ERROR" };
  }

  const row = await prisma.user.findUnique({ where: { email: normalized } });
  if (!row?.passwordHash || row.deletedAt) {
    return { ok: false, code: "UNAUTHORIZED" };
  }

  const match = await bcrypt.compare(password, row.passwordHash);
  if (!match) {
    return { ok: false, code: "UNAUTHORIZED" };
  }
  if (row.disabledAt) {
    return { ok: false, code: "DISABLED" };
  }

  const tokens = await issueTokensForUser(row.id);
  return { ok: true, tokens };
}

export async function authSessionFromAccessToken(token: string): Promise<AuthSession | null> {
  try {
    const payload = await verifyBearerToken(token);
    if (payload.kind === "refresh") {
      return null;
    }
    const sub = payload.sub;
    if (!sub || typeof sub !== "string") {
      return null;
    }
    const user = await loadUserWithMemberships(sub);
    if (!user) {
      return null;
    }
    return toAuthSession(user);
  } catch {
    return null;
  }
}

export async function refreshTokens(refreshToken: string): Promise<AuthTokens | null> {
  try {
    const payload = await verifyBearerToken(refreshToken);
    if (payload.kind !== "refresh") {
      return null;
    }
    const sub = payload.sub;
    if (!sub || typeof sub !== "string") {
      return null;
    }
    const user = await loadUserWithMemberships(sub);
    if (!user) {
      return null;
    }
    return issueTokensForUser(user.id);
  } catch {
    return null;
  }
}
