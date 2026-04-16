# Mobile Shell (Capacitor) — Platzhalter

1. `npm run build` in `../web` erzeugt `.output/public` (static) oder nutze `nuxt generate` wenn konfiguriert.
2. `npm init @capacitor/app` in diesem Ordner ausführen und `webDir` auf den Nuxt-Output zeigen.
3. Native Plugins (Push, Speech, Contacts, optional Android Call Hints) an [`@avelom/device-capabilities`](../../packages/device-capabilities) anbinden.

Die konkrete Capacitor-Initialisierung erfolgt bewusst nach Fixierung des Nuxt-Build-Ziels (SPA vs. SSR-Static).
