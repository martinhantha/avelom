# Native Gerätefähigkeiten — Adapter-Konzept

Implementierung: Paket [`packages/device-capabilities`](../packages/device-capabilities).

## Prinzipien

- **Kern-App** funktioniert ohne jede native Erweiterung (NoOp-Implementierung).
- Plattform-spezifische Logik **nur** in Adaptern; Nuxt-UI-Code spricht nur **`DeviceCapabilities`** an.
- **Android Call Hints:** optional, gekapselt in `AndroidCallHintCapabilities`; keine Rohdaten an den Server senden (siehe [LEGAL_PRIVACY.md](./LEGAL_PRIVACY.md)).

## Interface (Kurzüberblick)

- `startSpeechToText` — OS-Speech / Capacitor
- `takePhoto` — Kamera
- `requestPushPermission` — Push
- `pickContact` — Kontakte lesen (Permission)
- `getRecentCallHints` — Android optional; iOS NoOp
- `saveOrUpdateDeviceContact` — Kontakt schreiben (opt-in)

## Einbindung in Nuxt / Capacitor

1. Factory wählt Implementierung nach `Capacitor.getPlatform()`:
   - `android` → ggf. `AndroidCallHintCapabilities` wenn Nutzer Opt-in erteilt hat
   - sonst → `NoOpDeviceCapabilities` oder schrittweise echte Capacitor-Plugins
2. Tests: immer gegen `NoOpDeviceCapabilities` mocken.
