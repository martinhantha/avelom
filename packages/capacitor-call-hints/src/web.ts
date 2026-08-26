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

  async saveLocalContact(): Promise<{ contactId: string }> {
    throw this.unimplemented("saveLocalContact is native-only.");
  }
}
