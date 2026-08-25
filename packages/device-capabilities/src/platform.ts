import type { DevicePlatform } from "./types.js";

interface CapacitorBridge {
  isNativePlatform?: () => boolean;
  getPlatform?: () => string;
  isPluginAvailable?: (name: string) => boolean;
  Plugins?: Record<string, unknown>;
}

function capacitor(): CapacitorBridge | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as Window & { Capacitor?: CapacitorBridge }).Capacitor;
}

export function detectDevicePlatform(): DevicePlatform {
  const cap = capacitor();
  if (!cap?.isNativePlatform?.()) return "web";
  return cap.getPlatform?.() === "ios" ? "ios" : "android";
}

export function isNativeCapacitor(): boolean {
  return detectDevicePlatform() !== "web";
}

export function isCallHintsPluginAvailable(): boolean {
  const cap = capacitor();
  if (!cap?.isNativePlatform?.()) return false;
  if (typeof cap.isPluginAvailable === "function") {
    return cap.isPluginAvailable("CallHints");
  }
  return Boolean(cap.Plugins?.CallHints);
}
