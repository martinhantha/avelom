import { Capacitor } from "@capacitor/core";

export default defineNuxtPlugin(() => {
  if (!Capacitor.isNativePlatform()) return;
  document.documentElement.classList.add("capacitor-native", `capacitor-${Capacitor.getPlatform()}`);
});
