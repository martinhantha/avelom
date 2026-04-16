import type { CallHint, ContactWritePayload, DeviceCapabilities, SpeechRecognitionResult } from "./types.js";

export class NoOpDeviceCapabilities implements DeviceCapabilities {
  readonly id: string = "noop";

  async startSpeechToText(): Promise<SpeechRecognitionResult> {
    throw new Error("Speech not available on this platform build.");
  }

  async takePhoto(): Promise<Blob | null> {
    return null;
  }

  async requestPushPermission(): Promise<NotificationPermission | "unsupported"> {
    return "unsupported";
  }

  async pickContact(): Promise<{ name?: string; phone?: string; email?: string } | null> {
    return null;
  }

  async getRecentCallHints(): Promise<CallHint[]> {
    return [];
  }

  async saveOrUpdateDeviceContact(_payload: ContactWritePayload): Promise<void> {
    throw new Error("Contacts integration disabled.");
  }
}
