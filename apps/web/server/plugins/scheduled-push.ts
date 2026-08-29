import { runScheduledPushTick } from "~/server/utils/scheduled-push";

const TICK_MS = 15_000;

const globalForSched = globalThis as typeof globalThis & {
  avelomScheduledPushTimer?: ReturnType<typeof setInterval>;
};

export default defineNitroPlugin((nitro) => {
  if (import.meta.prerender) return;
  if (globalForSched.avelomScheduledPushTimer) return;

  console.info("[push] scheduled reminder/briefing ticker started");
  void runScheduledPushTick();
  globalForSched.avelomScheduledPushTimer = setInterval(() => {
    void runScheduledPushTick();
  }, TICK_MS);

  nitro.hooks.hook("close", () => {
    if (globalForSched.avelomScheduledPushTimer) {
      clearInterval(globalForSched.avelomScheduledPushTimer);
      globalForSched.avelomScheduledPushTimer = undefined;
    }
  });
});
