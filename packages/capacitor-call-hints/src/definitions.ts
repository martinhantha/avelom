import type { CallHint } from "@avelom/device-capabilities";
import type { PermissionState, PluginListenerHandle } from "@capacitor/core";

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
  notifications?: PermissionState;
}

export interface AvelomDevicePlugin {
  checkPermissions(): Promise<AvelomDevicePermissionStatus>;
  requestPermissions(options?: {
    alias?: "microphone" | "contacts" | "notifications";
  }): Promise<AvelomDevicePermissionStatus>;
  requestAllPermissions(): Promise<AvelomDevicePermissionStatus>;
  requestMicrophone(): Promise<AvelomDevicePermissionStatus>;
  openAppSettings(): Promise<void>;
  openWhatsApp(options: { phone: string; app?: "whatsapp" | "business" }): Promise<void>;
  showLocalNotification(options: { title: string; body: string; id?: string }): Promise<void>;
  getPushToken(): Promise<{ token?: string | null }>;
  startSpeechRecognition(options?: { lang?: string }): Promise<void>;
  stopSpeechRecognition(): Promise<void>;
  addListener(
    eventName: "speechTranscript",
    listenerFunc: (event: { transcript: string; isFinal: boolean }) => void,
  ): Promise<PluginListenerHandle>;
  addListener(
    eventName: "speechError",
    listenerFunc: (event: { message: string }) => void,
  ): Promise<PluginListenerHandle>;
  addListener(eventName: "speechSessionEnd", listenerFunc: () => void): Promise<PluginListenerHandle>;
  saveLocalContact(options: {
    displayName: string;
    phone?: string;
    note?: string;
    organization?: string;
  }): Promise<{ contactId: string }>;
  findContactByPhone(options: { phone: string }): Promise<{
    found: boolean;
    contactId?: string;
    displayName?: string;
    googleSynced?: boolean;
  }>;
  deleteContactByPhone(options: { phone: string }): Promise<{ deleted: number }>;
}
