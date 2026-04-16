import { loginWithEmailPassword } from "~/server/utils/auth-service";

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

  return result.tokens;
});
