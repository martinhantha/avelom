# Coolify-Deployment (Avelom / ogama)

Coolify orchestriert Docker-Compose-Stacks. Dieses Repository liefert [`docker-compose.yml`](../docker-compose.yml) als Referenz für **lokale Entwicklung** und als Vorlage für **Staging/Production**.

## Services

| Service | Zweck |
|---------|--------|
| `postgres` | Primärdatenbank (Prisma / PostgreSQL 16) |
| `redis` | Sessions, Rate-Limits, Queues (MVP minimal) |
| `web` | Nuxt 4 + Nitro (SSR, `/api/v1/*`, Cookie-Session `/api/auth/*`) — siehe `apps/web` |
| `worker` | Optional: Hintergrundjobs (`docker compose --profile worker up`) |
| `backup` | Optional: täglicher `pg_dump` via Profil `backup` |

## Coolify: empfohlene Schritte

1. **Neues Projekt** in Coolify anlegen (z. B. `avelom-production`).
2. **PostgreSQL** und **Redis** entweder als verwaltete Coolify-Services **oder** wie hier als Compose-Services betreiben.
3. **Secrets** in Coolify setzen (nicht im Git):
   - `POSTGRES_PASSWORD` (stark)
   - `DATABASE_URL` für die **Web-/Nitro-App** (zeigt auf den Postgres-Service)
   - `REDIS_URL`
   - JWT / OIDC Secrets für Auth
   - Push (FCM): `FIREBASE_SERVICE_ACCOUNT` = kompletter Inhalt der Dienstkonto-JSON (eine Zeile / Multiline-Secret). Nicht die `google-services.json`. Danach `prisma migrate deploy` (u. a. `DevicePushToken`, `reminderPushSentAt`, `NextDayBriefingPush`). Die 15-Minuten-Erinnerung und das 08:00-Briefing sendet der **web**-Prozess, kein extra Worker.
4. **Persistent Volumes** für Postgres-Daten und optional `pg_backups` mounten.
5. **Reverse Proxy / TLS**: Coolify vergibt automatisch Zertifikate; öffentliche Domain für die **Web-/API-App** (`web`, Port 3000 im Compose-Beispiel).
6. **Worker & Backup**: In Coolify als zusätzliche Services deployen oder dieselben Compose-Profile nutzen, sofern unterstützt.

## Web-Image (Nuxt + Nitro-API)

- Build: Repository-Root, Dockerfile `apps/web/Dockerfile` (siehe [docker-compose.yml](../docker-compose.yml))
- Port im Container: **3000** (an Proxy weiterreichen)
- Healthcheck: `GET /api/health`

## Capacitor (Mobile Shell)

- Web-Build läuft als SSR-Container oder statisch; Capacitor-Build ergänzt native Shells.
- Capacitor-Build: CI erzeugt `android/` / `ios/` Artefakte; Store-Upload außerhalb von Coolify oder über eigene Pipeline.

## Restore-Drill

- Quartalsweise Test-Restore aus `pg_backups` (oder externem Object Storage) durchführen und dokumentieren.
