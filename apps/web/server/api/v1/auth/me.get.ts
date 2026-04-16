import { getRequestHeader } from "h3";
import { authSessionFromAccessToken } from "~/server/utils/auth-service";

export default defineEventHandler(async (event) => {
  const h = getRequestHeader(event, "authorization");
  if (!h?.startsWith("Bearer ")) {
    throw createError({
      statusCode: 401,
      statusMessage: "Authentifizierung erforderlich",
      data: { code: "UNAUTHORIZED", message: "Authentifizierung erforderlich" },
    });
  }
  const token = h.slice(7);
  const session = await authSessionFromAccessToken(token);
  if (!session) {
    throw createError({
      statusCode: 401,
      statusMessage: "Ungültiges Token",
      data: { code: "UNAUTHORIZED", message: "Ungültiges Token" },
    });
  }
  return session;
});
