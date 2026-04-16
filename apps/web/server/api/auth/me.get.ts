import { authSessionFromAccessToken } from "~/server/utils/auth-service";

export default defineEventHandler(async (event) => {
  const { authCookie } = useRuntimeConfig();
  const name = authCookie ?? "avelom_at";
  const token = getCookie(event, name);
  if (!token) {
    throw createError({ statusCode: 401, statusMessage: "Nicht angemeldet" });
  }

  const session = await authSessionFromAccessToken(token);
  if (!session) {
    deleteCookie(event, name, { path: "/" });
    throw createError({ statusCode: 401, statusMessage: "Sitzung ungültig" });
  }

  return session;
});
