import type { CallHint } from "@avelom/device-capabilities";
import type { PermissionState } from "@capacitor/core";

export interface CallHintsPermissionStatus {
  callLog: PermissionState;
}

export interface CallHintsPlugin {
  getRecentCallHints(options?: { limit?: number }): Promise<{ hints: CallHint[] }>;
  checkPermissions(): Promise<CallHintsPermissionStatus>;
  requestPermissions(): Promise<CallHintsPermissionStatus>;
}
