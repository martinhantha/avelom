# Alpiplan (ogama)

Mandantenfähige Planungs- und Stundenerfassungsplattform für Flugschulen, Skischulen und ähnliche Betriebe.

- **Marke:** Alpiplan · **Projektname:** ogama (siehe [docs/GLOSSARY.md](docs/GLOSSARY.md))
- **Web + HTTP-API:** [apps/web](apps/web) — Nuxt 4 + Nuxt UI; **Auth & REST v1 laufen im Nitro-Server** (TypeScript). Vertrag: [docs/openapi/openapi.yaml](docs/openapi/openapi.yaml) (Basis-URL z. B. `/api/v1`).
- **Hintergrundjobs (optional):** [apps/worker](apps/worker) — TypeScript-Placeholder
- **Datenmodell:** [prisma/schema.prisma](prisma/schema.prisma)
- **Infra:** [docker-compose.yml](docker-compose.yml) · [docs/COOLIFY.md](docs/COOLIFY.md)
- **Native Adapter-Schnittstelle:** [packages/device-capabilities](packages/device-capabilities)
- **Mobile Hülle (Capacitor):** [apps/mobile-shell](apps/mobile-shell)

## Voraussetzungen

- [pnpm](https://pnpm.io/installation) (Version siehe `packageManager` in [package.json](package.json))
- PostgreSQL lokal oder via Docker — Verbindung in [`.env.example`](.env.example); eigene Datei **`.env`** im **Repo-Root** anlegen (ist per `.gitignore` ignoriert). Nitro lädt sie für Prisma/JWT.

## Schnellstart

```bash
pnpm install
pnpm db:validate
pnpm db:migrate
pnpm db:seed
pnpm dev:web
```

Nur Web-App (API inkl. `/api/v1/*` und Cookie-Login unter `/api/auth/*`):

- App: http://localhost:3000  
- Health: `GET http://localhost:3000/api/health`

Docker-Stack (Postgres, Redis, **web**):

```bash
docker compose up postgres redis web
```

Weitere Dokumente: `docs/` (Recht, Sync, Assistenz, Stakeholder-Signoff).
