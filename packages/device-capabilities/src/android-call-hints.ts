import type { CallHint, DeviceCapabilities } from "./types.js";
import { NoOpDeviceCapabilities } from "./noop.js";

/**
 * Android-only adapter stub: inject native module that reads call log / recent numbers
 * with user permission. Replace `fetchHintsFromNative` with Capacitor plugin bridge.
 */
export class AndroidCallHintCapabilities extends NoOpDeviceCapabilities implements DeviceCapabilities {
  override readonly id: string = "android-call-hints";

  override async getRecentCallHints(limit = 5): Promise<CallHint[]> {
    return fetchHintsFromNative(limit);
  }
}

/** Wire to Capacitor `CallHints` plugin — placeholder returns empty until implemented. */
async function fetchHintsFromNative(_limit: number): Promise<CallHint[]> {
  return [];
}
