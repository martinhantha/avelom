/** Normalized phone suggestion (no raw call logs on server). */
export interface CallHint {
  e164?: string;
  raw?: string;
  lastSeenAt: string;
  confidence: number;
}

export interface ContactWritePayload {
  displayName: string;
  phoneE164?: string;
  note?: string;
  /** Shown as company / organisation on the device contact. */
  organization?: string;
}

export interface PickedContact {
  name?: string;
  phone?: string;
  email?: string;
}

export interface SpeechRecognitionResult {
  transcript: string;
  locale?: string;
}

export type DevicePlatform = "web" | "android" | "ios";

export interface DeviceFeatureFlags {
  pickContact: boolean;
  saveContact: boolean;
  /** True when the Android CallHints plugin is present (opt-in still required). */
  callHints: boolean;
}

/**
 * Platform-neutral capability surface; Capacitor/native implementations live in app layer.
 */
export interface DeviceCapabilities {
  readonly id: string;
  readonly platform: DevicePlatform;
  readonly features: DeviceFeatureFlags;

  startSpeechToText(): Promise<SpeechRecognitionResult>;
  requestMicrophonePermission(): Promise<boolean>;
  takePhoto(): Promise<Blob | null>;
  requestPushPermission(): Promise<NotificationPermission | "unsupported">;
  pickContact(): Promise<PickedContact | null>;
  /** Optional Android: recent call hints; iOS/web typically empty. */
  getRecentCallHints(limit?: number): Promise<CallHint[]>;
  /** Save or update device contact — must be user-triggered. Browser: vCard download. */
  saveOrUpdateDeviceContact(payload: ContactWritePayload): Promise<void>;
}
