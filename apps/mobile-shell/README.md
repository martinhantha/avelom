# Mobile Shell (Capacitor)

Die Avelom-UI bleibt Nuxt (`apps/web`). Diese App ist nur die native Hülle: Android/iOS-WebView plus Plugins für **Kontakte** und (Android) **letzte Anrufe**.

## Prinzip

- Browser: volle Web-App, Kontakt speichern als **vCard**, kein Anrufprotokoll.
- Capacitor: dieselbe UI, native Kontakte, auf Android optionale Call-Hints.
- Die Hülle lädt die **gehostete Nuxt-App** (`CAPACITOR_SERVER_URL`). Auth-Cookies funktionieren so wie im Browser.

## Erstes Setup

```bash
# 1. Web-App lokal starten
pnpm dev:web

# 2. Native Projekte einmalig anlegen (erzeugt android/ und ios/)
cd apps/mobile-shell
CAPACITOR_SERVER_URL=http://192.168.x.x:3000 pnpm cap:add:android
CAPACITOR_SERVER_URL=http://192.168.x.x:3000 pnpm cap:add:ios   # nur auf macOS
pnpm cap:sync
pnpm cap:open:android
```

`192.168.x.x` ist die LAN-IP des Rechners, nicht `localhost` (das wäre das Telefon selbst).

Nach dem ersten `cap add android` in `android/app/src/main/AndroidManifest.xml` nichts extra für Call-Log tun — das Plugin bringt `READ_CALL_LOG` mit.

Nach `cap add ios` in `ios/App/App/Info.plist`:

```xml
<key>NSContactsUsageDescription</key>
<string>Avelom speichert oder liest Kontakte nur, wenn du das ausdrücklich auslöst.</string>
```

## Produktion

```bash
CAPACITOR_SERVER_URL=https://app.example.com pnpm cap:sync
```

Store-Builds: Android Studio / Xcode. `READ_CALL_LOG` ist bei Google Play eine **eingeschränkte** Permission — internes APK/MDM ist der einfachere Weg; Play Store braucht eine Kernfunktions-Begründung.

## Plugins

| Plugin | Zweck |
|--------|--------|
| `@capacitor-community/contacts` | Kontakt wählen / aufs Gerät schreiben |
| `@avelom/capacitor-call-hints` | Android: letzte Nummern, nur clientseitig, Opt-in in Einstellungen |

iOS liefert für Call-Hints immer eine leere Liste (OS-Limit).
