import type {
  CallHint,
  ContactWritePayload,
  DeviceCapabilities,
  DeviceFeatureFlags,
  DevicePlatform,
  PickedContact,
  SpeechRecognitionResult,
} from "./types.js";

/**
 * Android-only decorator: reads recent numbers via a native plugin (Capacitor CallHints).
 * Does not send raw call logs to the server.
 */
export class AndroidCallHintCapabilities implements DeviceCapabilities {
  readonly id: string = "android-call-hints";

  constructor(
    private readonly inner: DeviceCapabilities,
    private readonly fetchHints: (limit: number) => Promise<CallHint[]>,
  ) {}

  get platform(): DevicePlatform {
    return this.inner.platform;
  }

  get features(): DeviceFeatureFlags {
    return { ...this.inner.features, callHints: true };
  }

  startSpeechToText(): Promise<SpeechRecognitionResult> {
    return this.inner.startSpeechToText();
  }

  takePhoto(): Promise<Blob | null> {
    return this.inner.takePhoto();
  }

  requestPushPermission(): Promise<NotificationPermission | "unsupported"> {
    return this.inner.requestPushPermission();
  }

  pickContact(): Promise<PickedContact | null> {
    return this.inner.pickContact();
  }

  saveOrUpdateDeviceContact(payload: ContactWritePayload): Promise<void> {
    return this.inner.saveOrUpdateDeviceContact(payload);
  }

  getRecentCallHints(limit = 5): Promise<CallHint[]> {
    return this.fetchHints(limit);
  }
}
