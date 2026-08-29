import { runScheduledPushTick } from "~/server/utils/scheduled-push";

const TICK_MS = 30_000;

const globalForSched = globalThis as typeof globalThis & {
  avelomScheduledPush?: { timer?: ReturnType<typeof setInterval>; running?: boolean };
};

export default defineNitroPlugin((nitro) => {
  if (import.meta.prerender) return;

  const state = globalForSched.avelomScheduledPush ?? {};
  globalForSched.avelomScheduledPush = state;
  if (state.timer) return;

  const tick = async () => {
    if (state.running) return;
    state.running = true;
    try {
      await runScheduledPushTick();
    } catch (error) {
      console.warn("[push] scheduled tick failed", error);
    } finally {
      state.running = false;
    }
  };

  void tick();
  state.timer = setInterval(() => {
    void tick();
  }, TICK_MS);

  nitro.hooks.hook("close", () => {
    if (state.timer) clearInterval(state.timer);
    state.timer = undefined;
  });
});
