import { Capacitor, type PluginListenerHandle } from "@capacitor/core";
import { AvelomDevice } from "@avelom/capacitor-call-hints";

export function isNativeAndroidSpeech() {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
}

export async function startNativeSpeech(handlers: {
  onTranscript: (transcript: string, isFinal: boolean) => void;
  onError: (message: string) => void;
}): Promise<() => Promise<void>> {
  const handles: PluginListenerHandle[] = [
    await AvelomDevice.addListener("speechTranscript", (event) => {
      const transcript = (event.transcript ?? "").replace(/\s+/g, " ").trim();
      if (!transcript) return;
      handlers.onTranscript(transcript, Boolean(event.isFinal));
    }),
    await AvelomDevice.addListener("speechError", (event) => {
      handlers.onError(event.message || "Spracherkennung fehlgeschlagen.");
    }),
  ];
  await AvelomDevice.startSpeechRecognition({ lang: "de-DE" });
  return async () => {
    try {
      await AvelomDevice.stopSpeechRecognition();
    } catch {
      // Already stopped.
    }
    await Promise.all(handles.map((handle) => handle.remove()));
  };
}
