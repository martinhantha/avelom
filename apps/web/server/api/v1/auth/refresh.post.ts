import { refreshTokens } from "~/server/utils/auth-service";

export default defineEventHandler(async (event) => {
  const body = await readBody<{ refreshToken?: string }>(event);
  const refreshToken = typeof body.refreshToken === "string" ? body.refreshToken : "";
  if (!refreshToken) {
    throw createError({
      statusCode: 400,
      statusMessage: "refreshToken fehlt",
      data: { code: "VALIDATION_ERROR", message: "refreshToken fehlt" },
    });
  }

  const tokens = await refreshTokens(refreshToken);
  if (!tokens) {
    throw createError({
      statusCode: 401,
      statusMessage: "Ungültiges Token",
      data: { code: "UNAUTHORIZED", message: "Ungültiges Token" },
    });
  }

  return tokens;
});
