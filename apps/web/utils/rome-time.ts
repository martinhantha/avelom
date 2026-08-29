export const BUSINESS_TIME_ZONE = "Europe/Rome";
export const BRIEFING_HOUR = 8;
export const REMINDER_LEAD_MS = 15 * 60 * 1000;

export function tzParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: BUSINESS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
  };
}

export function dateKey(parts: { year: number; month: number; day: number }) {
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

export function addCalendarDays(parts: { year: number; month: number; day: number }, days: number) {
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() };
}

export function zonedLocalDate(ymd: { year: number; month: number; day: number }, hour: number, minute = 0) {
  const utcGuess = Date.UTC(ymd.year, ymd.month - 1, ymd.day, hour, minute, 0);
  const asLocal = tzParts(new Date(utcGuess));
  const localAsUtc = Date.UTC(asLocal.year, asLocal.month - 1, asLocal.day, asLocal.hour, asLocal.minute);
  return new Date(utcGuess - (localAsUtc - utcGuess));
}

/** True once the start is at most `leadMs` away and has not started yet. */
export function isReminderDue(startsAt: Date, now: Date, leadMs = REMINDER_LEAD_MS): boolean {
  const start = startsAt.getTime();
  const at = now.getTime();
  return start > at && start - leadMs <= at;
}

export function isBriefingDue(now: Date, hour = BRIEFING_HOUR): boolean {
  return tzParts(now).hour >= hour;
}
