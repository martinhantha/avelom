import { restoreCookieSession } from "~/server/utils/auth-cookies";

export default defineEventHandler(async (event) => {
  const session = await restoreCookieSession(event);
  if (!session) {
    throw createError({ statusCode: 401, statusMessage: "Nicht angemeldet" });
  }
  return session;
});
