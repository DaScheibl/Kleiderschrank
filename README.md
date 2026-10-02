# Kleidungsschrank

Erfasst den eigenen Kleiderschrank und schlägt täglich ein Outfit vor – ausschließlich aus
Teilen, die gerade wirklich sauber im Schrank hängen, und mit einem Satz Begründung.

React Native mit Expo (TypeScript), lokale SQLite-Datenbank als Wahrheit (local-first),
Supabase für Konto, Sync und Edge Functions.

- **Einrichtung:** [SETUP.md](SETUP.md)
- **Architektur und Entscheidungen:** [docs/PHASE-0-ARCHITEKTUR.md](docs/PHASE-0-ARCHITEKTUR.md)

## Aufbau

```
src/app/        Oberfläche (expo-router): Heute · Outfit · Schrank · Wäsche · Einstellungen
src/domain/     Fachlogik – reines TypeScript ohne React/Expo, deutsch benannt, mit Tests
src/data/       lokale Datenbank (Drizzle + expo-sqlite), Repositories, später Sync
src/services/   Dienste nach außen (Supabase, Wetter, Kalender, KI, Käufe)
src/hooks/      verbinden Fachlogik und Daten mit der Oberfläche
src/ui/         Design-Tokens und Komponenten
supabase/       SQL-Migrationen, Edge Functions, SQL-Tests
```

`src/domain` darf nichts aus React, Expo, `data` oder `services` importieren – ESLint
erzwingt das.

## Entscheidungen

| Nr. | Thema         | Entscheidung                                |
| --- | ------------- | ------------------------------------------- |
| E2  | Wetter-API    | MET Norway über eigenen Proxy               |
| E3  | Freistellen   | natives Modul (iOS Vision / Android ML Kit) |
| E8  | Texterkennung | on-device (ML Kit)                          |
