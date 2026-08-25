import { Capacitor } from "@capacitor/core";
import { Contacts, PhoneType } from "@capacitor-community/contacts";
import {
  WebDeviceCapabilities,
  isCallHintsPluginAvailable,
  type ContactWritePayload,
  type DeviceCapabilities,
  type DeviceFeatureFlags,
  type DevicePlatform,
  type PickedContact,
} from "@avelom/device-capabilities";
import { CallHints } from "@avelom/capacitor-call-hints";

function nativePlatform(): DevicePlatform {
  return Capacitor.getPlatform() === "ios" ? "ios" : "android";
}

export class CapacitorDeviceCapabilities extends WebDeviceCapabilities implements DeviceCapabilities {
  override readonly id = "capacitor";
  override readonly platform: DevicePlatform = nativePlatform();

  override get features(): DeviceFeatureFlags {
    return {
      pickContact: true,
      saveContact: true,
      callHints: this.platform === "android" && isCallHintsPluginAvailable(),
    };
  }

  override async pickContact(): Promise<PickedContact | null> {
    try {
      const result = await Contacts.pickContact({
        projection: { name: true, phones: true, emails: true },
      });
      const name =
        result.contact.name?.display ||
        [result.contact.name?.given, result.contact.name?.family].filter(Boolean).join(" ") ||
        undefined;
      const phone =
        result.contact.phones?.find((item) => item.isPrimary)?.number ||
        result.contact.phones?.[0]?.number ||
        undefined;
      const email = result.contact.emails?.[0]?.address || undefined;
      if (!name && !phone && !email) return null;
      return { name, phone: phone ?? undefined, email };
    } catch {
      return super.pickContact();
    }
  }

  override async getRecentCallHints() {
    return [];
  }

  override async saveOrUpdateDeviceContact(payload: ContactWritePayload): Promise<void> {
    try {
      const permission = await Contacts.requestPermissions();
      if (permission.contacts !== "granted" && permission.contacts !== "limited") {
        await super.saveOrUpdateDeviceContact(payload);
        return;
      }
      const given = payload.displayName.trim() || "Avelom Kontakt";
      await Contacts.createContact({
        contact: {
          name: { given },
          phones: payload.phoneE164
            ? [{ type: PhoneType.Mobile, number: payload.phoneE164, isPrimary: true }]
            : [],
          note: payload.note?.trim() || null,
        },
      });
    } catch {
      await super.saveOrUpdateDeviceContact(payload);
    }
  }
}

export async function requestCallHintsPermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "android") return false;
  const status = await CallHints.requestPermissions();
  return status.callLog === "granted";
}
