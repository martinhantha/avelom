import * as jose from "jose";

function getSecret(): Uint8Array {
  const raw = process.env.JWT_SECRET;
  if (!raw || raw.length < 16) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("JWT_SECRET must be set (min. 16 characters) in production");
    }
    return new TextEncoder().encode("avelom-dev-only-change-me");
  }
  return new TextEncoder().encode(raw);
}

export async function signAccessToken(userId: string): Promise<string> {
  const secret = getSecret();
  return new jose.SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(process.env.JWT_ACCESS_TTL ?? "8h")
    .sign(secret);
}

export async function signRefreshToken(userId: string): Promise<string> {
  const secret = getSecret();
  return new jose.SignJWT({ kind: "refresh" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(process.env.JWT_REFRESH_TTL ?? "30d")
    .sign(secret);
}

export async function verifyBearerToken(token: string): Promise<jose.JWTPayload> {
  const secret = getSecret();
  const { payload } = await jose.jwtVerify(token, secret);
  return payload;
}
