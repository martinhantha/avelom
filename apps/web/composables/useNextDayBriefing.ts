import { Capacitor } from "@capacitor/core";
import { AvelomDevice } from "@avelom/capacitor-call-hints";
import { APPOINTMENT_LIVE_EVENT } from "~/types/live-events";
import { resolveAppointmentDisplayName } from "~/utils/appointment-contact";

const TZ = "Europe/Rome";
const BRIEFING_HOUR = 8;
const POLL_MS = 60_000;
const SHOWN_KEY = "avelom.briefing.shown";

export interface NextDayBriefingItem {
  id: string;
  startsAt: string;
  title: string;
}

export interface NextDayBriefing {
  dateKey: string;
  items: NextDayBriefingItem[];
}

interface AppointmentListItem {
  id: string;
  startsAt: string;
  status: string;
  appointmentContactText: string | null;
  teacher: { id: string; displayName: string } | null;
  customer: { displayName: string | null } | null;
}

function tzParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
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

function dateKey(parts: { year: number; month: number; day: number }) {
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

function addCalendarDays(parts: { year: number; month: number; day: number }, days: number) {
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() };
}

function zonedLocalDate(ymd: { year: number; month: number; day: number }, hour: number, minute = 0) {
  const utcGuess = Date.UTC(ymd.year, ymd.month - 1, ymd.day, hour, minute, 0);
  const asLocal = tzParts(new Date(utcGuess));
  const localAsUtc = Date.UTC(asLocal.year, asLocal.month - 1, asLocal.day, asLocal.hour, asLocal.minute);
  return new Date(utcGuess - (localAsUtc - utcGuess));
}

function loadShownKeys(): Set<string> {
  if (!import.meta.client) return new Set();
  try {
    const raw = localStorage.getItem(SHOWN_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return new Set(Array.isArray(parsed) ? parsed.filter((key) => typeof key === "string") : []);
  } catch {
    return new Set();
  }
}

function persistShownKeys(keys: Set<string>) {
  if (!import.meta.client) return;
  localStorage.setItem(SHOWN_KEY, JSON.stringify([...keys].slice(-30)));
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("de-DE", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

async function notifyOs(briefing: NextDayBriefing) {
  const times = briefing.items.map((item) => `${formatTime(item.startsAt)} ${item.title}`).join(", ");
  const title = "Termine morgen";
  const body = `${briefing.items.length} ${briefing.items.length === 1 ? "Termin" : "Termine"} · ${times}`;

  if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android") {
    try {
      await AvelomDevice.showLocalNotification({
        title,
        body,
        id: `briefing-${briefing.dateKey}`,
      });
      return;
    } catch {
      // Fall through to the browser Notification API.
    }
  }
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  try {
    new Notification(title, { body, tag: `briefing-${briefing.dateKey}` });
  } catch {
    // Some WebViews reject Notification construction even after permission.
  }
}

export function useNextDayBriefing() {
  const { user, primaryTenant } = useAuth();
  const briefing = useState<NextDayBriefing | null>("appointment-briefing", () => null);
  const shownKeys = useState<Set<string>>("appointment-briefing-shown", () => loadShownKeys());

  let pollTimer: ReturnType<typeof setInterval> | undefined;
  let fireTimer: ReturnType<typeof setTimeout> | undefined;

  function storageKey(dayKey: string) {
    return `${primaryTenant.value?.tenantId ?? "none"}:${user.value?.id ?? "anon"}:${dayKey}`;
  }

  function dismiss() {
    briefing.value = null;
  }

  function present(next: NextDayBriefing) {
    const key = storageKey(next.dateKey);
    if (shownKeys.value.has(key)) return;
    shownKeys.value.add(key);
    persistShownKeys(shownKeys.value);
    briefing.value = next;
    void notifyOs(next);
  }

  async function loadTomorrowItems(): Promise<NextDayBriefingItem[]> {
    const tenantId = primaryTenant.value?.tenantId;
    const myTeacherId = primaryTenant.value?.teacherProfileId;
    if (!tenantId || !myTeacherId) return [];

    const nowParts = tzParts(new Date());
    const tomorrow = addCalendarDays(nowParts, 1);
    const from = zonedLocalDate(tomorrow, 0, 0);
    const to = zonedLocalDate(addCalendarDays(tomorrow, 1), 0, 0);

    const response = await $fetch<{ data: AppointmentListItem[] }>(
      `/api/v1/tenants/${tenantId}/appointments`,
      {
        credentials: "include",
        query: {
          from: from.toISOString(),
          to: to.toISOString(),
          status: "draft,confirmed",
          pageSize: 100,
          sort: "asc",
        },
      },
    );

    return response.data
      .filter((item) => item.teacher?.id === myTeacherId)
      .map((item) => ({
        id: item.id,
        startsAt: item.startsAt,
        title: resolveAppointmentDisplayName(item),
      }));
  }

  async function maybeShow() {
    if (!import.meta.client || !user.value || !primaryTenant.value?.tenantId) return;
    if (user.value.nextDayBriefingEnabled === false) {
      briefing.value = null;
      return;
    }

    const now = new Date();
    const today = tzParts(now);
    const briefingAt = zonedLocalDate(today, BRIEFING_HOUR, 0);
    if (now < briefingAt) {
      if (fireTimer) clearTimeout(fireTimer);
      fireTimer = setTimeout(() => {
        void maybeShow();
      }, Math.min(briefingAt.getTime() - now.getTime() + 250, 2_147_000_000));
      return;
    }

    const todayKey = dateKey(today);
    if (shownKeys.value.has(storageKey(todayKey))) return;

    try {
      const items = await loadTomorrowItems();
      if (!items.length) {
        shownKeys.value.add(storageKey(todayKey));
        persistShownKeys(shownKeys.value);
        return;
      }
      present({ dateKey: todayKey, items });
    } catch {
      // Try again on the next poll.
    }
  }

  function onVisible() {
    if (document.visibilityState === "visible") void maybeShow();
  }

  onMounted(() => {
    void maybeShow();
    pollTimer = setInterval(() => {
      void maybeShow();
    }, POLL_MS);
    window.addEventListener(APPOINTMENT_LIVE_EVENT, onVisible);
    document.addEventListener("visibilitychange", onVisible);
  });

  onUnmounted(() => {
    if (pollTimer) clearInterval(pollTimer);
    if (fireTimer) clearTimeout(fireTimer);
    window.removeEventListener(APPOINTMENT_LIVE_EVENT, onVisible);
    document.removeEventListener("visibilitychange", onVisible);
  });

  watch(
    [
      () => user.value?.id,
      () => user.value?.nextDayBriefingEnabled,
      () => primaryTenant.value?.tenantId,
    ],
    () => {
      void maybeShow();
    },
  );

  return { briefing, dismiss };
}
