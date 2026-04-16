export default defineEventHandler((event) => {
  const { authCookie } = useRuntimeConfig();
  const name = authCookie ?? "avelom_at";
  deleteCookie(event, name, { path: "/" });
  return { ok: true as const };
});
