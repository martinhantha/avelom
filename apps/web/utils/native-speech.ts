import { Capacitor, type PluginListenerHandle } from "@capacitor/core";
import { AlpiplanDevice } from "@alpiplan/capacitor-call-hints";

export function isNativeAndroidSpeech() {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
}

export async function startNativeSpeech(handlers: {
  onTranscript: (transcript: string, isFinal: boolean) => void;
  onSessionEnd?: () => void;
  onError: (message: string) => void;
}): Promise<() => Promise<void>> {
  const handles: PluginListenerHandle[] = [
    await AlpiplanDevice.addListener("speechTranscript", (event) => {
      const transcript = (event.transcript ?? "").replace(/\s+/g, " ").trim();
      if (!transcript) return;
      handlers.onTranscript(transcript, Boolean(event.isFinal));
    }),
    await AlpiplanDevice.addListener("speechSessionEnd", () => {
      handlers.onSessionEnd?.();
    }),
    await AlpiplanDevice.addListener("speechError", (event) => {
      handlers.onError(event.message || "Spracherkennung fehlgeschlagen.");
    }),
  ];
  await AlpiplanDevice.startSpeechRecognition({ lang: "de-DE" });
  return async () => {
    try {
      await AlpiplanDevice.stopSpeechRecognition();
    } catch {
      // Already stopped.
    }
    await Promise.all(handles.map((handle) => handle.remove()));
  };
}
