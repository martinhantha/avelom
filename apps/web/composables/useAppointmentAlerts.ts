import { Capacitor } from "@capacitor/core";
import { AvelomDevice } from "@avelom/capacitor-call-hints";
import {
  APPOINTMENT_CREATED_EVENT,
  type AppointmentCreatedLiveEvent,
} from "~/types/live-events";

let askedPushPermission = false;

function isCreatedEvent(value: unknown): value is AppointmentCreatedLiveEvent {
  if (!value || typeof value !== "object") return false;
  const event = value as Partial<AppointmentCreatedLiveEvent>;
  return event.type === "appointment.created" && typeof event.appointmentId === "string";
}

function browserCanAskNotifications() {
  return typeof Notification !== "undefined" && Notification.permission === "default";
}

async function notifyOs(event: AppointmentCreatedLiveEvent, body: string) {
  if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android") {
    try {
      await AvelomDevice.showLocalNotification({
        title: "Neuer Termin",
        body,
        id: event.appointmentId,
      });
      return;
    } catch {
      // Fall through to the browser Notification API.
    }
  }

  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  try {
    new Notification("Neuer Termin", { body, tag: event.appointmentId });
  } catch {
    // Some WebViews reject Notification construction even after permission.
  }
}

export function useAppointmentAlerts() {
  const { user, primaryTenant } = useAuth();
  const { device } = useDeviceCapabilities();
  const alert = ref<AppointmentCreatedLiveEvent | null>(null);
  const canAskNotifications = ref(false);

  let source: EventSource | null = null;
  let hideTimer: ReturnType<typeof setTimeout> | undefined;

  function dismiss() {
    alert.value = null;
    if (hideTimer) {
      clearTimeout(hideTimer);
      hideTimer = undefined;
    }
  }

  function disconnect() {
    source?.close();
    source = null;
  }

  async function maybeRequestPush() {
    if (askedPushPermission) return;
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "android") return;
    askedPushPermission = true;
    try {
      await device.value.requestPushPermission();
    } catch {
      askedPushPermission = false;
    }
  }

  async function enableNotifications() {
    try {
      await device.value.requestPushPermission();
    } catch {
      // Keep the in-app popup even if the system prompt is dismissed.
    }
    canAskNotifications.value = browserCanAskNotifications();
  }

  function show(event: AppointmentCreatedLiveEvent) {
    window.dispatchEvent(new CustomEvent(APPOINTMENT_CREATED_EVENT, { detail: event }));

    const ownFocusedTab = event.createdByUserId === user.value?.id && document.hasFocus();
    if (ownFocusedTab) return;

    alert.value = event;
    canAskNotifications.value = browserCanAskNotifications();
    if (hideTimer) clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
      if (alert.value?.appointmentId === event.appointmentId) {
        alert.value = null;
      }
    }, 12_000);

    const when = new Intl.DateTimeFormat("de-DE", {
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(event.startsAt));
    const body = [event.title, when].filter(Boolean).join(" · ");
    void notifyOs(event, body);
  }

  function connect() {
    disconnect();
    const tenantId = primaryTenant.value?.tenantId;
    if (!import.meta.client || !user.value || !tenantId) return;

    const sourceUrl = `/api/v1/tenants/${tenantId}/events`;
    source = new EventSource(sourceUrl, { withCredentials: true });
    source.onmessage = (message) => {
      try {
        const payload: unknown = JSON.parse(message.data);
        if (isCreatedEvent(payload)) show(payload);
      } catch {
        // Ignore keep-alives and malformed frames.
      }
    };
    window.setTimeout(() => {
      void maybeRequestPush();
    }, 2500);
  }

  watch(
    [user, () => primaryTenant.value?.tenantId],
    () => {
      connect();
    },
    { immediate: true },
  );

  onUnmounted(() => {
    disconnect();
    dismiss();
  });

  return { alert, dismiss, canAskNotifications, enableNotifications };
}

export function useAppointmentListSync(reload: () => void | Promise<void>) {
  function onCreated() {
    void reload();
  }

  onMounted(() => {
    window.addEventListener(APPOINTMENT_CREATED_EVENT, onCreated);
  });

  onUnmounted(() => {
    window.removeEventListener(APPOINTMENT_CREATED_EVENT, onCreated);
  });
}
