import { Capacitor } from "@capacitor/core";
import {
  AndroidCallHintCapabilities,
  WebDeviceCapabilities,
  isCallHintsOptIn,
  type CallHint,
  type DeviceCapabilities,
} from "@avelom/device-capabilities";
import { CallHints } from "@avelom/capacitor-call-hints";
import { CapacitorDeviceCapabilities } from "./capacitor-device-capabilities";

export function createRuntimeDeviceCapabilities(): DeviceCapabilities {
  if (!Capacitor.isNativePlatform()) {
    return new WebDeviceCapabilities();
  }

  const inner = new CapacitorDeviceCapabilities();
  if (Capacitor.getPlatform() === "android" && isCallHintsOptIn()) {
    return new AndroidCallHintCapabilities(inner, async (limit): Promise<CallHint[]> => {
      const result = await CallHints.getRecentCallHints({ limit });
      return result.hints ?? [];
    });
  }
  return inner;
}
