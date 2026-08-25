import { WebDeviceCapabilities, persistCallHintsOptIn, type DeviceCapabilities } from "@avelom/device-capabilities";

const fallback = new WebDeviceCapabilities();
const sharedDevice = shallowRef<DeviceCapabilities>(fallback);
const deviceReady = ref(false);

const ssrSafe: DeviceCapabilities = {
  id: "web",
  platform: "web",
  features: { pickContact: false, saveContact: false, callHints: false },
  startSpeechToText: () => fallback.startSpeechToText(),
  takePhoto: () => fallback.takePhoto(),
  requestPushPermission: () => fallback.requestPushPermission(),
  pickContact: () => fallback.pickContact(),
  getRecentCallHints: () => fallback.getRecentCallHints(),
  saveOrUpdateDeviceContact: (payload) => fallback.saveOrUpdateDeviceContact(payload),
};

export function useDeviceCapabilities() {
  const nuxtApp = useNuxtApp();

  onMounted(() => {
    sharedDevice.value = (nuxtApp.$device as DeviceCapabilities | undefined) ?? fallback;
    deviceReady.value = true;
  });

  const device = computed(() => (deviceReady.value ? sharedDevice.value : ssrSafe));

  async function refresh() {
    if (!import.meta.client) return;
    const { createRuntimeDeviceCapabilities } = await import("../utils/create-device-capabilities");
    sharedDevice.value = createRuntimeDeviceCapabilities();
    nuxtApp.$device = sharedDevice.value;
    deviceReady.value = true;
  }

  async function setCallHintsOptIn(enabled: boolean) {
    persistCallHintsOptIn(enabled);
    if (enabled && import.meta.client) {
      const { requestCallHintsPermission } = await import("../utils/capacitor-device-capabilities");
      const granted = await requestCallHintsPermission();
      if (!granted) {
        persistCallHintsOptIn(false);
        await refresh();
        throw new Error("Berechtigung für die Anrufliste wurde nicht erteilt.");
      }
    }
    await refresh();
  }

  return { device, refresh, setCallHintsOptIn };
}
