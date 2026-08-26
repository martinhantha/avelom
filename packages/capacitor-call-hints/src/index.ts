import { registerPlugin } from "@capacitor/core";
import type { AvelomDevicePlugin, CallHintsPlugin } from "./definitions";

const CallHints = registerPlugin<CallHintsPlugin>("CallHints", {
  web: () => import("./web").then((module) => new module.CallHintsWeb()),
});

const AvelomDevice = registerPlugin<AvelomDevicePlugin>("AvelomDevice", {
  web: () => import("./web").then((module) => new module.AvelomDeviceWeb()),
});

export * from "./definitions";
export { AvelomDevice, CallHints };
