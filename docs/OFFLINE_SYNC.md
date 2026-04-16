# Offline-Synchronisation — Spezifikation (MVP)

## Ziele

- Mobile Nutzer können **Termine offline anlegen** (Outbox).
- Synchronisation erfolgt ** später automatisch** mit Retry/Backoff.
- **Konflikte** werden erkannt; Nutzer kann auflösen.

## Client: Outbox

Jede Operation ist ein Eintrag in einer lokalen Queue (SQLite/IndexedDB):

| Feld | Beschreibung |
|------|----------------|
| `opId` | UUID, client-eindeutig |
| `type` | `APPOINTMENT_CREATE` \| `APPOINTMENT_PATCH` \| `APPOINTMENT_DELETE` |
| `payload` | JSON gemäß API (siehe OpenAPI `SyncOperation`) |
| `baseVersion` | Erwartete Server-`version` bei PATCH |
| `createdAt` | Client-Zeitstempel |
| `status` | `pending` \| `syncing` \| `failed` \| `applied` |

## Server: Idempotenz

- Header **`Idempotency-Key`** oder deduplizieren über `opId` pro Tenant/User.
- Wiederholter Push mit gleichem `opId` → Antwort **`duplicate`** mit vorhandener Entität (kein Doppel-Insert).

## Optimistic Concurrency

- Entitäten mit **`version`** (Integer monoton steigend bei Server-Updates).
- PATCH mit `If-Match: <version>` oder `baseVersion` im Body.
- Bei Mismatch: **`OUTDATED_VERSION`** → Client zeigt Merge-UI.

## Konflikttypen

| Code | Bedeutung | UI-Flow |
|------|-----------|---------|
| `TIME_OVERLAP` | Lehrer/Ressource doppelt belegt | Alternative Zeiten/Lehrer anbieten |
| `RESOURCE_DOUBLE_BOOK` | Kapazität überschritten | Andere Ressource / Slot |
| `VERSION_MISMATCH` | Parallel editiert | „Serverstand laden“ / Diff / Überschreiben |

## Pull-Sync (optional MVP+)

- `GET /sync/pull?since=cursor` liefert Änderungsfeed (upsert/delete).
- **`delete`**-Events transportieren Soft-Delete (`deletedAt` gesetzt); Client entfernt lokal oder setzt Tombstone.

## Priorisierung bei Konflikten

1. Server **validiert** Hard-Constraints (Verfügbarkeit, Ressource).
2. Bei Konflikt: Operation **`rejected`** mit strukturiertem `ApiError`.
3. Nutzer entscheidet: **neu planen**, **Alternative wählen**, **verwerfen**.

## Nicht-Ziele (MVP)

- Vollständiger Offline-Kalender aller Lehrer.
- CRDT-Merge für freie Textfelder.
