import { runScheduledPushTick } from "~/server/utils/scheduled-push";

export default defineEventHandler(() => {
  void runScheduledPushTick();
  return {
    ok: true as const,
    service: "alpiplan-web",
  };
});
