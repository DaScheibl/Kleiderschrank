# Einrichtung – vom frischen Windows-Rechner zur laufenden App

Diese Anleitung führt Schritt für Schritt von null bis zur App auf deinem iPhone. Sie
setzt nichts voraus außer einem Windows-Rechner, einem iPhone (oder Android-Gerät) und
einer Internetverbindung. Dauer: etwa 20–30 Minuten.

Befehle tippst du in **PowerShell** ein (Startmenü → „PowerShell“). Jeder Befehl steht
in einem eigenen grauen Kasten.

---

## Teil 1 – Werkzeuge installieren (einmalig)

### 1.1 Node.js

1. Öffne <https://nodejs.org> und lade die Version **„LTS“** herunter.
2. Installer starten, alle Voreinstellungen übernehmen.
3. **PowerShell neu öffnen** (sonst kennt sie Node noch nicht) und prüfen:

```bash
node --version
```

Es muss eine Versionsnummer wie `v24.x.x` erscheinen (mindestens 20).

### 1.2 Git

1. Öffne <https://git-scm.com/download/win> und lade „64-bit Git for Windows Setup“.
2. Installer starten, alle Voreinstellungen übernehmen.
3. PowerShell neu öffnen und prüfen:

```bash
git --version
```

### 1.3 Expo Go auf dem Telefon

- iPhone: im App Store nach **„Expo Go“** suchen und installieren.
- Android: im Play Store nach **„Expo Go“** suchen und installieren.

Telefon und Rechner müssen später **im selben WLAN** sein.

---

## Teil 2 – Projekt holen und Pakete installieren

### 2.1 Repository klonen

Wechsle in den Ordner, in dem das Projekt liegen soll (z. B. den Desktop), und klone es.
`<REPO-URL>` ersetzt du durch die Adresse deines Repositorys:

```bash
cd $HOME\Desktop
```

```bash
git clone <REPO-URL> Kleidungsschrank
```

```bash
cd Kleidungsschrank
```

### 2.2 Pakete installieren

```bash
npm install
```

Das dauert beim ersten Mal ein paar Minuten. Warnungen der Form `npm audit` kannst du
ignorieren; Fehler in Rot nicht.

### 2.3 Prüfen, ob alles stimmt

```bash
npm run check
```

Am Ende müssen die Tests als bestanden gemeldet werden, darunter
`29 bestanden, 0 fehlgeschlagen` für die Datenbankskripte.

---

## Teil 3 – Supabase-Projekt anlegen

Die App funktioniert **ohne Supabase** vollständig auf dem Gerät. Supabase wird erst für
Konto, Sync und KI gebraucht (ab Block A2). Du kannst Teil 3 und 4 also auch später
erledigen und direkt zu **Teil 5** springen, um die App zu starten.

### 3.1 Konto und Projekt

1. Öffne <https://supabase.com> → **Start your project** → mit GitHub oder E-Mail anmelden.
2. **New project** wählen.
3. Ausfüllen:
   - **Name:** `kleidungsschrank`
   - **Database Password:** auf „Generate a password“ klicken und das Passwort in deinem
     Passwortmanager speichern. Die App braucht es nicht, aber du für Notfälle.
   - **Region:** **Central EU (Frankfurt)** – damit die Daten in der EU liegen.
   - **Plan:** Free reicht für die Entwicklung.
4. **Create new project** und ca. 2 Minuten warten, bis das Projekt bereit ist.

### 3.2 Die beiden Schlüssel – welcher wohin darf

Im Projekt oben auf **Connect** klicken (alternativ: **Project Settings → API Keys**).
Du findest dort:

| Wert                                                     | Sieht aus wie                  | Darf in die App?                                                                                                                                        |
| -------------------------------------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Project URL**                                          | `https://abcdefgh.supabase.co` | **Ja**                                                                                                                                                  |
| **Publishable key** (in älteren Projekten „anon public“) | `sb_publishable_…` bzw. `eyJ…` | **Ja** – Row Level Security schützt die Daten                                                                                                           |
| **Secret key** (in älteren Projekten „service_role“)     | `sb_secret_…` bzw. `eyJ…`      | **Niemals.** Er umgeht alle Schutzregeln. Er lebt nur in den Edge Functions, wo Supabase ihn automatisch bereitstellt. Du musst ihn nirgends eintragen. |

Außerdem brauchst du die **Project Ref**: das ist der Teil `abcdefgh` aus der Project URL.

### 3.3 Werte in die App eintragen

Im Projektordner die Vorlage kopieren:

```bash
Copy-Item .env.example .env
```

Dann `.env` mit einem Editor öffnen (z. B. `notepad .env`) und eintragen:

```
EXPO_PUBLIC_SUPABASE_URL=https://abcdefgh.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Speichern. `.env` wird nie eingecheckt (steht in `.gitignore`).

### 3.4 Anonyme Anmeldung einschalten

Die App legt beim ersten Start still eine anonyme Sitzung an (Entscheidung E1). So
funktioniert sie ohne Registrierung, und der Server kann trotzdem Limits durchsetzen.

Im Dashboard: **Authentication → Sign In / Providers** → **Allow anonymous sign-ins**
einschalten → **Save**.

---

## Teil 4 – Datenbank, Bucket und Edge Functions

### 4.1 SQL-Skripte ausführen

Die Skripte liegen unter `supabase/migrations/`. Jedes ist **wiederholbar**: ein zweiter
Lauf macht nichts kaputt.

1. Im Supabase-Dashboard links **SQL Editor** öffnen.
2. **New query** anlegen.
3. Für jede Datei **in genau dieser Reihenfolge**: Datei in einem Editor öffnen, gesamten
   Inhalt kopieren, in den SQL Editor einfügen (vorherigen Inhalt ersetzen), **Run** klicken.
   Erwartet wird jeweils „Success“.

| Reihenfolge | Datei                     | Was sie anlegt                                      |
| ----------- | ------------------------- | --------------------------------------------------- |
| 1           | `001_hilfsfunktionen.sql` | Trigger für Konfliktregel, Policy-Vorlagen          |
| 2           | `002_kleidungsstueck.sql` | Tabelle Kleidungsstück                              |
| 3           | `003_outfit.sql`          | Outfit und Zuordnung der Teile                      |
| 4           | `004_trage_eintrag.sql`   | Trageeinträge                                       |
| 5           | `005_profile.sql`         | Wäscheschwellen, Größen-, Stilprofil, Einstellungen |
| 6           | `006_ki.sql`              | KI-Tageszähler, Kostenprotokoll, Cache              |
| 7           | `007_abo.sql`             | Abo-Status                                          |
| 8           | `008_storage.sql`         | privater Bucket `kleidung` mit Policies             |
| 9           | `099_pruefung.sql`        | **Sicherheitsprüfung**                              |

Beim letzten Skript muss als Ergebnis die Zeile **„Prüfung bestanden …“** erscheinen.
Erscheint stattdessen ein Fehler mit „BLOCKER“, ist eine Tabelle ungeschützt – dann bitte
nicht weitermachen und mir die Meldung schicken.

Hinweis: Fragt der SQL Editor nach, ob du eine Abfrage mit „destructive operations“
wirklich ausführen willst, liegt das an den `drop policy if exists`-Zeilen. Das ist
gewollt (so werden die Policies bei jedem Lauf neu gesetzt) und löscht keine Daten.

### 4.2 Bucket prüfen

Der Bucket entsteht durch Skript 8 automatisch. Zur Kontrolle: links **Storage** öffnen.
Dort muss ein Bucket **`kleidung`** stehen, **ohne** den Hinweis „Public“.

### 4.3 Edge Functions ausrollen

Die Funktionen laufen auf Supabase-Servern. Dort liegen später alle geheimen Schlüssel.
Docker ist **nicht** nötig.

1. Anmelden (öffnet den Browser, dort bestätigen):

```bash
npx supabase login
```

2. Projekt verknüpfen. `abcdefgh` durch deine Project Ref ersetzen; nach dem
   Datenbankpasswort aus 3.1 gefragt, einfach Enter drücken (wird nicht gebraucht):

```bash
npx supabase link --project-ref abcdefgh
```

3. Beide Funktionen ausrollen:

```bash
npx supabase functions deploy konto-loeschen ki-sortierung --use-api
```

4. Kontrolle im Dashboard unter **Edge Functions**: beide Funktionen sind gelistet.

### 4.4 Secrets der Edge Functions (erst ab Block B4 nötig)

Solange kein KI-Anbieter gewählt ist (Entscheidung E4), gibt es nichts einzutragen. Später:

```bash
Copy-Item supabase\functions\.env.example supabase\functions\.env
```

Werte in `supabase\functions\.env` eintragen, dann:

```bash
npx supabase secrets set --env-file supabase/functions/.env
```

Neue Secrets wirken sofort, ohne erneutes Ausrollen.

---

## Teil 5 – App auf dem iPhone starten

1. Im Projektordner:

```bash
npm start
```

2. Im Terminal erscheint ein **QR-Code**.
3. iPhone: die normale **Kamera-App** auf den QR-Code richten und auf den Hinweis
   „In Expo Go öffnen“ tippen. Android: in **Expo Go** auf „Scan QR code“ tippen.
4. Beim ersten Start baut der Rechner das Bundle, das dauert ca. 30 Sekunden.

**Klappt die Verbindung nicht** (Firmen-WLAN, Gäste-WLAN, Windows-Firewall): Strg+C
drücken und im Tunnel-Modus starten:

```bash
npx expo start --tunnel
```

Fragt Windows beim ersten Start, ob Node.js im Netzwerk kommunizieren darf: **Private
Netzwerke** erlauben.

### Abnahmetest A0

1. Tab **Schrank** öffnen → oben rechts **Hinzufügen**.
2. Name eingeben, Kategorie und Hauptfarbe wählen → **Speichern**.
3. Das Teil erscheint als Karte im Schrank.
4. Expo Go komplett schließen (vom unteren Rand wischen und Expo Go nach oben wegwischen).
5. Expo Go neu öffnen und das Projekt wieder starten → das Teil ist noch da.

---

## Nützliche Befehle

| Befehl                  | Zweck                                                                                  |
| ----------------------- | -------------------------------------------------------------------------------------- |
| `npm start`             | Entwicklungsserver mit QR-Code                                                         |
| `npm run check`         | Typen, Lint, Format, Tests und SQL-Tests in einem                                      |
| `npm run test`          | Unit-Tests der Fachlogik                                                               |
| `npm run test:sql`      | alle SQL-Skripte zweimal gegen ein lokales Postgres + Sicherheitstests                 |
| `npm run test:supabase` | Sync gegen das echte Supabase-Projekt (legt einen Testnutzer an und löscht ihn wieder) |
| `npm run format`        | Code formatieren                                                                       |
| `npm run db:generate`   | nach Änderungen an `src/data/db/schema.ts` die lokale Migration erzeugen               |

## Ab wann Expo Go nicht mehr reicht

Mit der Entscheidung E3 = natives Freistellen endet Expo Go mit **Block C2**. Ab dann
braucht es einen **Development Build** über EAS. Für das iPhone setzt das das
Apple-Developer-Programm voraus (99 $/Jahr); für Android nicht. Die genaue Anleitung
kommt mit Block C2.
