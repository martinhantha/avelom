/**
 * Placeholder worker — später z. B. BullMQ für Benachrichtigungen & Automation.
 */
const redisUrl = process.env.REDIS_URL ?? "not set";

console.log("[avelom-worker] started (placeholder). Redis:", redisUrl);

setInterval(() => {
  console.log("[avelom-worker] heartbeat");
}, 60_000);
