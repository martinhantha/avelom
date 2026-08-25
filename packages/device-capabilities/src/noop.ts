import type {
  CallHint,
  ContactWritePayload,
  DeviceCapabilities,
  DeviceFeatureFlags,
  DevicePlatform,
  PickedContact,
  SpeechRecognitionResult,
} from "./types.js";

export class NoOpDeviceCapabilities implements DeviceCapabilities {
  readonly id: string = "noop";
  readonly platform: DevicePlatform = "web";
  readonly features: DeviceFeatureFlags = {
    pickContact: false,
    saveContact: false,
    callHints: false,
  };

  async startSpeechToText(): Promise<SpeechRecognitionResult> {
    throw new Error("Speech not available on this platform build.");
  }

  async takePhoto(): Promise<Blob | null> {
    return null;
  }

  async requestPushPermission(): Promise<NotificationPermission | "unsupported"> {
    return "unsupported";
  }

  async pickContact(): Promise<PickedContact | null> {
    return null;
  }

  async getRecentCallHints(): Promise<CallHint[]> {
    return [];
  }

  async saveOrUpdateDeviceContact(_payload: ContactWritePayload): Promise<void> {
    throw new Error("Contacts integration disabled.");
  }
}
