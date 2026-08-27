import type {
  CallHint,
  ContactWritePayload,
  DeviceCapabilities,
  DeviceContactLookupResult,
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
    lookupContact: false,
    deleteContact: false,
    callHints: false,
  };

  async startSpeechToText(): Promise<SpeechRecognitionResult> {
    throw new Error("Speech not available on this platform build.");
  }

  async requestMicrophonePermission(): Promise<boolean> {
    return false;
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

  async lookupDeviceContact(_phone: string): Promise<DeviceContactLookupResult> {
    return { status: "unknown" };
  }

  async deleteDeviceContact(_phone: string): Promise<void> {
    throw new Error("Contacts integration disabled.");
  }
}
