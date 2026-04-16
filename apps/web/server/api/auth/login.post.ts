import { authSessionFromAccessToken, loginWithEmailPassword } from "~/server/utils/auth-service";

export default defineEventHandler(async (event) => {
  const body = await readBody<{ email?: string; password?: string }>(event);
  const result = await loginWithEmailPassword(body.email ?? "", body.password ?? "");

  if (!result.ok) {
    const message =
      result.code === "VALIDATION_ERROR"
        ? "E-Mail und Passwort sind erforderlich"
        : "Ungültige Anmeldedaten";
    throw createError({
      statusCode: result.code === "VALIDATION_ERROR" ? 400 : 401,
      statusMessage: message,
      data: { code: result.code, message },
    });
  }

  const { tokens } = result;
  const { authCookie } = useRuntimeConfig();
  const name = authCookie ?? "avelom_at";
  const maxAge = tokens.expiresIn ?? 8 * 3600;

  setCookie(event, name, tokens.accessToken, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge,
    secure: process.env.NODE_ENV === "production",
  });

  const session = await authSessionFromAccessToken(tokens.accessToken);
  if (!session) {
    throw createError({ statusCode: 500, statusMessage: "Sitzung konnte nicht erstellt werden" });
  }

  return session;
});
