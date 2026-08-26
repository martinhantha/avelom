import { loginWithEmailPassword } from "~/server/utils/auth-service";

function loginErrorMessage(code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "DISABLED") {
  if (code === "VALIDATION_ERROR") return "E-Mail und Passwort sind erforderlich";
  if (code === "DISABLED") return "Dieses Konto ist gesperrt";
  return "Ungültige Anmeldedaten";
}

export default defineEventHandler(async (event) => {
  const body = await readBody<{ email?: string; password?: string }>(event);
  const result = await loginWithEmailPassword(body.email ?? "", body.password ?? "");

  if (!result.ok) {
    const message = loginErrorMessage(result.code);
    throw createError({
      statusCode: result.code === "VALIDATION_ERROR" ? 400 : 401,
      statusMessage: message,
      data: { code: result.code, message },
    });
  }

  return result.tokens;
});
