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

export interface AvelomDevicePermissionStatus {
  microphone: PermissionState;
  contacts: PermissionState;
}

export interface AvelomDevicePlugin {
  checkPermissions(): Promise<AvelomDevicePermissionStatus>;
  requestPermissions(options?: { alias?: "microphone" | "contacts" }): Promise<AvelomDevicePermissionStatus>;
  requestAllPermissions(): Promise<AvelomDevicePermissionStatus>;
  requestMicrophone(): Promise<AvelomDevicePermissionStatus>;
  openAppSettings(): Promise<void>;
  saveLocalContact(options: {
    displayName: string;
    phone?: string;
    note?: string;
    organization?: string;
  }): Promise<{ contactId: string }>;
}
