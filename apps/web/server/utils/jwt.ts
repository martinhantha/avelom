import * as jose from "jose";

export const JWT_ACCESS_TTL = process.env.JWT_ACCESS_TTL ?? "8h";
/** Long-lived app session; cookie + token stay valid until logout (max ~400d in browsers). */
export const JWT_REFRESH_TTL = process.env.JWT_REFRESH_TTL ?? "400d";

const UNIT_SECONDS: Record<string, number> = {
  s: 1,
  m: 60,
  h: 3600,
  d: 86400,
  w: 7 * 86400,
};

export function ttlToSeconds(ttl: string, fallbackSec: number): number {
  const match = /^(\d+)\s*([smhdw])$/i.exec(ttl.trim());
  if (!match) return fallbackSec;
  return Number(match[1]) * (UNIT_SECONDS[match[2].toLowerCase()] ?? 1);
}

export const ACCESS_TTL_SEC = ttlToSeconds(JWT_ACCESS_TTL, 8 * 3600);
export const REFRESH_TTL_SEC = ttlToSeconds(JWT_REFRESH_TTL, 400 * 86400);

function getSecret(): Uint8Array {
  const raw = process.env.JWT_SECRET;
  if (!raw || raw.length < 16) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("JWT_SECRET must be set (min. 16 characters) in production");
    }
    return new TextEncoder().encode("alpiplan-dev-only-change-me");
  }
  return new TextEncoder().encode(raw);
}

export async function signAccessToken(userId: string): Promise<string> {
  const secret = getSecret();
  return new jose.SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(JWT_ACCESS_TTL)
    .sign(secret);
}

export async function signRefreshToken(userId: string): Promise<string> {
  const secret = getSecret();
  return new jose.SignJWT({ kind: "refresh" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(JWT_REFRESH_TTL)
    .sign(secret);
}

export async function verifyBearerToken(token: string): Promise<jose.JWTPayload> {
  const secret = getSecret();
  const { payload } = await jose.jwtVerify(token, secret);
  return payload;
}
