import { clearAuthCookies } from "~/server/utils/auth-cookies";

export default defineEventHandler((event) => {
  clearAuthCookies(event);
  return { ok: true as const };
});
