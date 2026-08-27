import type { DeviceContactLookupResult } from "@avelom/device-capabilities";
import { computed, onBeforeUnmount, ref, toValue, watch, type MaybeRefOrGetter } from "vue";
import { useDeviceCapabilities } from "./useDeviceCapabilities";

function digitCount(phone: string): number {
  return phone.replace(/\D/g, "").length;
}

export function useDeviceContactLookup(phoneSource: MaybeRefOrGetter<string | null | undefined>) {
  const { device } = useDeviceCapabilities();
  const lookup = ref<DeviceContactLookupResult>({ status: "unknown" });
  const checking = ref(false);
  let timer: ReturnType<typeof setTimeout> | undefined;
  let requestId = 0;

  const canLookup = computed(() => device.value.features.lookupContact);
  const canDelete = computed(() => device.value.features.deleteContact);
  const savedOnDevice = computed(() => lookup.value.status === "saved");

  async function refresh() {
    const phone = (toValue(phoneSource) ?? "").trim();
    if (!canLookup.value || digitCount(phone) < 6) {
      lookup.value = { status: "unknown" };
      checking.value = false;
      return;
    }
    const id = ++requestId;
    checking.value = true;
    try {
      const result = await device.value.lookupDeviceContact(phone);
      if (id !== requestId) return;
      lookup.value = result;
    } catch {
      if (id !== requestId) return;
      lookup.value = { status: "unknown" };
    } finally {
      if (id === requestId) checking.value = false;
    }
  }

  function scheduleRefresh() {
    clearTimeout(timer);
    timer = setTimeout(() => {
      void refresh();
    }, 350);
  }

  watch(
    () => [(toValue(phoneSource) ?? "").trim(), canLookup.value] as const,
    scheduleRefresh,
    { immediate: true },
  );

  onBeforeUnmount(() => {
    requestId += 1;
    clearTimeout(timer);
  });

  return { lookup, checking, canLookup, canDelete, savedOnDevice, refresh };
}
