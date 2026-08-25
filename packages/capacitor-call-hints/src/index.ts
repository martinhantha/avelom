import { registerPlugin } from "@capacitor/core";
import type { CallHintsPlugin } from "./definitions";

const CallHints = registerPlugin<CallHintsPlugin>("CallHints", {
  web: () => import("./web").then((module) => new module.CallHintsWeb()),
});

export * from "./definitions";
export { CallHints };
