export type * from "./types.js";
export { NoOpDeviceCapabilities } from "./noop.js";
export { WebDeviceCapabilities } from "./web.js";
export { AndroidCallHintCapabilities } from "./android-call-hints.js";
export { toVCard, downloadVCard } from "./vcard.js";
export {
  ALPIPLAN_CONTACT_NOTE,
  ALPIPLAN_CONTACT_ORGANIZATION,
  withAlpiplanContactMeta,
} from "./contact-meta.js";
export {
  detectDevicePlatform,
  isNativeCapacitor,
  isCallHintsPluginAvailable,
} from "./platform.js";
export {
  CALL_HINTS_OPT_IN_KEY,
  isCallHintsOptIn,
  persistCallHintsOptIn,
} from "./opt-in.js";
