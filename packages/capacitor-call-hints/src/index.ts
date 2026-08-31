import { registerPlugin } from "@capacitor/core";
import type { AlpiplanDevicePlugin, CallHintsPlugin } from "./definitions";

const CallHints = registerPlugin<CallHintsPlugin>("CallHints", {
  web: () => import("./web").then((module) => new module.CallHintsWeb()),
});

const AlpiplanDevice = registerPlugin<AlpiplanDevicePlugin>("AlpiplanDevice", {
  web: () => import("./web").then((module) => new module.AlpiplanDeviceWeb()),
});

export * from "./definitions";
export { AlpiplanDevice, CallHints };
