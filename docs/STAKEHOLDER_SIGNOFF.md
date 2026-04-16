# Stakeholder-Signoff — Avelom (ogama)

Dieses Dokument dient der formalen Abstimmung von Vision, MVP-Umfang und Markenführung vor Start der Umsetzungsphase.

## 1. Produktvision (Kurzfassung)

- Mandantenfähige Betriebssoftware für Flugschulen, Skischulen und vergleichbare Betriebe.
- Kernnutzen: **extrem schnelle** Termin- und Stundenerfassung am Smartphone; **kein** Zwang zur sofortigen Kundenanlage.
- Technische Leitplanken: **Nuxt 4**, **Nuxt UI**, **Capacitor** (keine PWA als Haupt-App, kein PhoneGap); Backend in **Docker** auf **Coolify**.
- Organisator-Assistent: Gegenfragen, merkbare Präferenzen (opt-in), Kurzbefehle; Phase 2: Automationsregeln.

## 2. Markenführung

- **Öffentlich / UI / Stores:** **Avelom**
- **Intern / Repo / technische Pakete:** **ogama** (optional), siehe [GLOSSARY.md](./GLOSSARY.md)

**Signoff Markenführung**

| Rolle | Name | Datum | Unterschrift / OK |
|-------|------|-------|-------------------|
| Produkt | | | ☐ |
| Geschäftsführung | | | ☐ |

## 3. MVP-Umfang (Abschnitt 18 — Muss-Kriterien)

Stakeholder bestätigen, dass der folgende MVP-Umfang ausreichend und realistisch ist:

- [ ] Mandanten, Rollen: Superadmin, Admin, Mitarbeiter, Endkunde (eingeschränkt)
- [ ] Schnelltermin mit freiem Text + optional Telefon ohne Kunde
- [ ] Kalender; Ressource/Lehrer-Zuordnung (einfach)
- [ ] Verfügbarkeit: wiederkehrend + Ausnahmen
- [ ] Planungsvorschläge: regelbasiert, Konflikte, Alternativen
- [ ] Organisator-Assistent (MVP): Gegenfragen (Chips), explizite Präferenzen „merken“, Kurzbefehle/Vorlagen
- [ ] Push (Ziel) oder In-App; Offline-Outbox für Termin-Create + Basis-Konfliktbehandlung
- [ ] Kundenverknüpfung mit einfachem Fuzzy-Match
- [ ] Reporting minimal (Stunden pro Lehrer/Tag)
- [ ] Backup-Konzept operativ
- [ ] Soft Delete auf Domänenmodellen; API/Sync dokumentiert

**Signoff MVP**

| Rolle | Name | Datum | OK |
|-------|------|-------|-----|
| Produkt | | | ☐ |
| Technik | | | ☐ |
| Pilotkunde(n) | | | ☐ |

## 4. Bewusst nicht im MVP (Won’t)

- Vollständige Buchhaltung, komplexe Lagerverwaltung (siehe Konzept Abschnitt 18).

## 5. Nächste Schritte nach Signoff

1. Priorisierte Backlogs aus [openapi/openapi.yaml](./openapi/openapi.yaml) und [DATA_MODEL.md](./DATA_MODEL.md) ableiten.
2. Rechtliche Anhänge: [LEGAL_PRIVACY.md](./LEGAL_PRIVACY.md).
3. UX-Validierung: Prototyp unter `apps/web`.
