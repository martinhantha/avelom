import { runScheduledPushTick } from "~/server/utils/scheduled-push";

const TICK_MS = 15_000;

const globalForSched = globalThis as typeof globalThis & {
  alpiplanScheduledPushTimer?: ReturnType<typeof setInterval>;
};

export default defineNitroPlugin((nitro) => {
  if (import.meta.prerender) return;
  if (globalForSched.alpiplanScheduledPushTimer) return;

  console.info("[push] scheduled reminder/briefing ticker started");
  void runScheduledPushTick();
  globalForSched.alpiplanScheduledPushTimer = setInterval(() => {
    void runScheduledPushTick();
  }, TICK_MS);

  nitro.hooks.hook("close", () => {
    if (globalForSched.alpiplanScheduledPushTimer) {
      clearInterval(globalForSched.alpiplanScheduledPushTimer);
      globalForSched.alpiplanScheduledPushTimer = undefined;
    }
  });
});
