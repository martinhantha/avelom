import { WebPlugin } from "@capacitor/core";
import type { CallHint } from "@avelom/device-capabilities";
import type { CallHintsPlugin, CallHintsPermissionStatus } from "./definitions";

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
