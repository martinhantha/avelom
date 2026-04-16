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
}

export interface SpeechRecognitionResult {
  transcript: string;
  locale?: string;
}

/**
 * Platform-neutral capability surface; Capacitor/native implementations live in app layer.
 */
export interface DeviceCapabilities {
  readonly id: string;

  startSpeechToText(): Promise<SpeechRecognitionResult>;
  takePhoto(): Promise<Blob | null>;
  requestPushPermission(): Promise<NotificationPermission | "unsupported">;
  pickContact(): Promise<{ name?: string; phone?: string; email?: string } | null>;
  /** Optional Android: recent call hints; iOS typically NoOp. */
  getRecentCallHints(limit?: number): Promise<CallHint[]>;
  /** Optional: save or update device contact — must be user-triggered. */
  saveOrUpdateDeviceContact(payload: ContactWritePayload): Promise<void>;
}
