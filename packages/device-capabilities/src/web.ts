import { detectDevicePlatform } from "./platform.js";
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
import { downloadVCard } from "./vcard.js";

interface ContactPickerContact {
  name?: string[];
  tel?: string[];
  email?: string[];
}

interface ContactsManager {
  getProperties?: () => Promise<string[]>;
  select: (properties: string[], options?: { multiple?: boolean }) => Promise<ContactPickerContact[]>;
}

function contactPicker(): ContactsManager | undefined {
  if (typeof navigator === "undefined") return undefined;
  const contacts = (navigator as Navigator & { contacts?: ContactsManager }).contacts;
  if (!contacts || typeof contacts.select !== "function") return undefined;
  return contacts;
}

export class WebDeviceCapabilities implements DeviceCapabilities {
  readonly id: string = "web";
  readonly platform: DevicePlatform = detectDevicePlatform();

  get features(): DeviceFeatureFlags {
    return {
      pickContact: Boolean(contactPicker()),
      saveContact: true,
      lookupContact: false,
      deleteContact: false,
      callHints: false,
    };
  }

  async startSpeechToText(): Promise<SpeechRecognitionResult> {
    throw new Error("Speech not available on this platform build.");
  }

  async requestMicrophonePermission(): Promise<boolean> {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      return true;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      for (const track of stream.getTracks()) track.stop();
      return true;
    } catch {
      return false;
    }
  }

  async takePhoto(): Promise<Blob | null> {
    return null;
  }

  async requestPushPermission(): Promise<NotificationPermission | "unsupported"> {
    if (typeof Notification === "undefined") return "unsupported";
    if (Notification.permission === "granted") return "granted";
    if (Notification.permission === "denied") return "denied";
    return Notification.requestPermission();
  }

  async pickContact(): Promise<PickedContact | null> {
    const picker = contactPicker();
    if (!picker) return null;
    const wanted = ["name", "tel", "email"];
    const supported = typeof picker.getProperties === "function" ? await picker.getProperties() : wanted;
    const properties = wanted.filter((item) => supported.includes(item));
    if (!properties.length) return null;
    const [contact] = await picker.select(properties, { multiple: false });
    if (!contact) return null;
    return {
      name: contact.name?.[0],
      phone: contact.tel?.[0],
      email: contact.email?.[0],
    };
  }

  async getRecentCallHints(): Promise<CallHint[]> {
    return [];
  }

  async saveOrUpdateDeviceContact(payload: ContactWritePayload): Promise<void> {
    downloadVCard(payload);
  }

  async lookupDeviceContact(_phone: string): Promise<DeviceContactLookupResult> {
    return { status: "unknown" };
  }

  async deleteDeviceContact(_phone: string): Promise<void> {
    // Browser has no address-book write API.
  }
}
