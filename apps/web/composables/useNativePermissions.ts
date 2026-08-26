import { Capacitor } from "@capacitor/core";
import type { AvelomDevicePermissionStatus } from "@avelom/capacitor-call-hints";

const PROMPT_SESSION_KEY = "avelom.device.permissionsPrompted";

const emptyStatus: AvelomDevicePermissionStatus = {
  microphone: "prompt",
  contacts: "prompt",
};

function isGranted(state: string | undefined) {
  return state === "granted" || state === "limited";
}

export function useNativePermissions(options?: { autoPrompt?: boolean }) {
  const open = ref(false);
  const requesting = ref(false);
  const status = ref<AvelomDevicePermissionStatus>({ ...emptyStatus });
  const isNative = computed(() => Capacitor.isNativePlatform());

  const microphoneGranted = computed(() => isGranted(status.value.microphone));
  const contactsGranted = computed(() => isGranted(status.value.contacts));
  const allGranted = computed(() => microphoneGranted.value && contactsGranted.value);
  const anyDenied = computed(
    () => status.value.microphone === "denied" || status.value.contacts === "denied",
  );

  async function plugin() {
    const { AvelomDevice } = await import("@avelom/capacitor-call-hints");
    return AvelomDevice;
  }

  async function refreshStatus() {
    if (!Capacitor.isNativePlatform()) return;
    try {
      status.value = await (await plugin()).checkPermissions();
    } catch {
      status.value = { ...emptyStatus };
    }
  }

  async function requestNow() {
    if (!Capacitor.isNativePlatform()) return;
    requesting.value = true;
    try {
      status.value = await (await plugin()).requestAllPermissions();
      if (allGranted.value) open.value = false;
    } finally {
      requesting.value = false;
    }
  }

  async function openAppSettings() {
    if (!Capacitor.isNativePlatform()) return;
    await (await plugin()).openAppSettings();
  }

  onMounted(async () => {
    if (!options?.autoPrompt || !Capacitor.isNativePlatform()) return;
    await refreshStatus();
    if (allGranted.value) return;
    if (typeof sessionStorage !== "undefined" && sessionStorage.getItem(PROMPT_SESSION_KEY) === "1") {
      return;
    }
    sessionStorage.setItem(PROMPT_SESSION_KEY, "1");
    open.value = true;
    await nextTick();
    await requestNow();
  });

  return {
    open,
    requesting,
    status,
    isNative,
    microphoneGranted,
    contactsGranted,
    allGranted,
    anyDenied,
    refreshStatus,
    requestNow,
    openAppSettings,
  };
}
