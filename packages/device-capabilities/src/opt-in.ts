export const CALL_HINTS_OPT_IN_KEY = "alpiplan.device.callHintsOptIn";

export function isCallHintsOptIn(): boolean {
  if (typeof localStorage === "undefined") return false;
  return localStorage.getItem(CALL_HINTS_OPT_IN_KEY) === "1";
}

export function persistCallHintsOptIn(enabled: boolean): void {
  if (typeof localStorage === "undefined") return;
  if (enabled) {
    localStorage.setItem(CALL_HINTS_OPT_IN_KEY, "1");
  } else {
    localStorage.removeItem(CALL_HINTS_OPT_IN_KEY);
  }
}
