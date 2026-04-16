# Organisator-Assistent — Spezifikation

Begleitend zum Konzept (Abschnitt 8a): Umsetzungsdetails für Produkt/Frontend/Backend.

## 1. Gegenfragen (Clarifying Questions)

### Auslöser

- Parser-Konfidenz unter Schwelle (pro Feld konfigurierbar, z. B. `< 0.6`).
- Mehrdeutige Entität (mehrere Lehrer mit gleichem Vornamen).
- Fehlende Pflichtplanungsinformation (z. B. Dauer unklar, aber für Konfliktprüfung nötig).
- Planungskonflikt nach serverseitiger Validierung.

### Darstellung

- Max. **3** aktive Fragen pro Flow; Rest in „Details“ ausklappbar.
- Antworten als **`UButton` / Chips**, keine Freitext-Pflicht.
- **`Später klären`**: nur wenn Speichern als `draft` fachlich erlaubt ist.

### API

- `POST /assistant/parse-intent` liefert `clarifyingQuestions[]` mit stabilen `id` und `options[]`.
- Client sendet Antworten als PATCH auf denselben Intent-Entwurf oder kumulativ im nächsten Parse-Request (`answers: { [questionId]: value }` — Endpoint im Backend verfeinern).

## 2. „Merken“ — Präferenzen

### Explizit (`UserAssistantPreference`)

- Nach Nutzerentscheidung: Toggle **„Für künftige Termine merken“**.
- Keys namespaced: z. B. `defaults.durationMinutes`, `defaults.lessonTypeId`, `defaults.resourceId`.
- `source = explicit_user`.

### Aus Korrekturen lernen

- Standard: **aus** oder `suggestions_only`.
- Bei Korrektur: Ereignis `learn_signal` (ohne Audio/PII) — z. B. Alias→`customerId`.
- `source = learned_correction`; in **Einstellungen → Assistenz** einzeln löschbar.

## 3. Automatisierung

- **MVP:** `AppointmentTemplate` / Kurzbefehle — keine Hintergrund-Engine.
- **Phase 2:** `AutomationRule` mit allowlist für `trigger`/`actions`; Ausführung in `AutomationRun` + `AuditLog`.

## 4. DSGVO

- Siehe [LEGAL_PRIVACY.md](./LEGAL_PRIVACY.md): Transparenz, Export, Löschung, kein Cross-Tenant-Learning.

## 5. Akzeptanzkriterien (Auszug)

- Bei hoher Konfidenz **keine** unnötigen Rückfragen (Happy Path &lt; 5 s).
- Keine automatische Buchung ohne Nutzerbestätigung (MVP).
- Alle Assistenz-Daten für Nutzer **einsehbar und löschbar**.
