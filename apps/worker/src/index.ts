/**
 * Placeholder worker — später z. B. BullMQ für Benachrichtigungen & Automation.
 */
const redisUrl = process.env.REDIS_URL ?? "not set";

console.log("[alpiplan-worker] started (placeholder). Redis:", redisUrl);

setInterval(() => {
  console.log("[alpiplan-worker] heartbeat");
}, 60_000);
