import { WebPlugin } from "@capacitor/core";
import type { CallHint } from "@avelom/device-capabilities";
import type {
  AvelomDevicePermissionStatus,
  AvelomDevicePlugin,
  CallHintsPlugin,
  CallHintsPermissionStatus,
} from "./definitions";

export class CallHintsWeb extends WebPlugin implements CallHintsPlugin {
  async getRecentCallHints(_options?: { limit?: number }): Promise<{ hints: CallHint[] }> {
    return { hints: [] };
  }

  async checkPermissions(): Promise<CallHintsPermissionStatus> {
    return { callLog: "denied" };
  }

  async requestPermissions(): Promise<CallHintsPermissionStatus> {
    return { callLog: "denied" };
  }
}

export class AvelomDeviceWeb extends WebPlugin implements AvelomDevicePlugin {
  async checkPermissions(): Promise<AvelomDevicePermissionStatus> {
    return { microphone: "prompt", contacts: "prompt" };
  }

  async requestPermissions(): Promise<AvelomDevicePermissionStatus> {
    return this.checkPermissions();
  }

  async requestMicrophone(): Promise<AvelomDevicePermissionStatus> {
    return this.checkPermissions();
  }

  async requestAllPermissions(): Promise<AvelomDevicePermissionStatus> {
    return this.checkPermissions();
  }

  async openAppSettings(): Promise<void> {
    // Browser: nothing to open.
  }

  async openWhatsApp(): Promise<void> {
    throw this.unimplemented("openWhatsApp is native-only.");
  }

  async saveLocalContact(): Promise<{ contactId: string }> {
    throw this.unimplemented("saveLocalContact is native-only.");
  }

  async findContactByPhone(): Promise<{ found: boolean }> {
    return { found: false };
  }

  async deleteContactByPhone(): Promise<{ deleted: number }> {
    throw this.unimplemented("deleteContactByPhone is native-only.");
  }

  async showLocalNotification(): Promise<void> {
    // Browser notifications are handled by the Notification API.
  }

  async startSpeechRecognition(): Promise<void> {
    throw this.unimplemented("startSpeechRecognition is native-only.");
  }

  async stopSpeechRecognition(): Promise<void> {
    // Browser speech uses the Web Speech API.
  }
}
