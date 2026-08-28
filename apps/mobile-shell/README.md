# Mobile Shell (Capacitor)

Die Avelom-UI bleibt Nuxt (`apps/web`). Diese App ist nur die native Hülle: Android/iOS-WebView plus Plugins für **Kontakte** und (Android) **letzte Anrufe**.

## Prinzip

- Browser: volle Web-App, Kontakt speichern als **vCard**, kein Anrufprotokoll.
- Capacitor: dieselbe UI, native Kontakte, auf Android optionale Call-Hints.
- Die Hülle lädt die **gehostete Nuxt-App** (`CAPACITOR_SERVER_URL`). Auth-Cookies funktionieren so wie im Browser.

## Erstes Setup

```bash
# 1. In der Repo-Root-.env setzen, z. B.:
#    CAPACITOR_SERVER_URL=https://avelom.myflights.cloud  # Live (App-Test)
#    CAPACITOR_SERVER_URL=http://10.0.2.2:3000            # Android-Emulator
#    CAPACITOR_SERVER_URL=http://192.168.x.x:3000         # physisches Gerät (LAN-IP)

# 2. Web-App lokal starten (fürs Gerät: --host 0.0.0.0)
pnpm dev:web

# 3. Native Projekte einmalig anlegen (erzeugt android/ und ios/)
cd apps/mobile-shell
pnpm cap:add:android
pnpm cap:add:ios   # nur auf macOS
pnpm cap:sync
pnpm cap:open:android
```

`capacitor.config.ts` liest `CAPACITOR_SERVER_URL` aus der Root-`.env`. Ohne diese Variable (und ohne Prefix auf `cap:sync`) zeigt die App die Platzhalterseite „nicht gesetzt“.

- **Live / App-Test:** `https://avelom.myflights.cloud` — UI und `/api` kommen von Production; kein lokaler Nuxt nötig.
- **Android-Emulator (lokal):** `http://10.0.2.2:3000` — `10.0.2.2` ist der Host-Rechner, nicht `localhost` und oft auch nicht `192.168.x.x`.
- **Physisches Gerät (lokal):** `http://192.168.x.x:3000` (LAN-IP des Rechners, nicht `localhost`). Nuxt muss mit `--host 0.0.0.0` lauschen.

Nach dem ersten `cap add android` in `android/app/src/main/AndroidManifest.xml` nichts extra für Call-Log oder Mikrofon tun — das Plugin bringt `READ_CALL_LOG`, `RECORD_AUDIO` und `WRITE_CONTACTS` mit. Kontakte werden lokal unter dem Konto **Avelom** gespeichert (nicht Google).

`pnpm cap:add:ios` und `pnpm cap:sync` schreiben die Privacy-Keys in `ios/App/App/Info.plist` (Kontakte, Mikrofon, Spracherkennung). Ohne `NSContactsUsageDescription` stürzt iOS beim Speichern eines Kontakts ab. Dieselben Commands setzen App-Icon und Splash aus `resources/icon.png`.

## Produktion

```bash
# .env: CAPACITOR_SERVER_URL=https://avelom.myflights.cloud
pnpm cap:sync
```

Store-Builds: Android Studio / Xcode. `READ_CALL_LOG` ist bei Google Play eine **eingeschränkte** Permission — internes APK/MDM ist der einfachere Weg; Play Store braucht eine Kernfunktions-Begründung.

## Plugins

| Plugin | Zweck |
|--------|--------|
| `@capacitor-community/contacts` | Kontakt wählen; Fallback beim Schreiben |
| `@avelom/capacitor-call-hints` | Android: letzte Nummern, Mikrofon-Permission, lokale Avelom-Kontakte |

iOS liefert für Call-Hints immer eine leere Liste (OS-Limit).
