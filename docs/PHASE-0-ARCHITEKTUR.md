# Phase 0 – Bestandsaufnahme und Architekturplan

Stand: 02.10.2026. Noch kein Produktivcode. Dieses Dokument wartet auf Freigabe.

Ausgangslage: Das Arbeitsverzeichnis ist leer. Alles entsteht von null: das
Expo-Projekt, das Supabase-Schema und die Einrichtungsanleitung.

---

## 1. Typdefinition in TypeScript (aus A1)

Liegt später unter `src/domain/modell/typen.ts`. Das ist reines TypeScript ohne
React-Abhängigkeit.

```ts
// ---------- Grundtypen ----------
export type Uuid = string;
export type IsoZeitpunkt = string;   // "2026-10-02T07:15:00.000Z"
export type LokalesDatum = string;   // "2026-10-02" – Kalendertag in der Zeitzone des Geräts

export type Kategorie = 'oberteil' | 'hose' | 'jacke' | 'schuhe' | 'accessoire' | 'schmuck';

export type Waermegrad = 0 | 1 | 2 | 3;    // Sommer, Übergang, kühl, Winter
export type Formalitaet = 0 | 1 | 2 | 3;   // casual, smart casual, business, förmlich

export type Muster = 'uni' | 'gestreift' | 'kariert' | 'gepunktet' | 'gemustert' | 'print';
export type Metallton = 'gold' | 'silber' | 'rose' | 'gemischt' | 'keins';
export type Waeschestatus = 'sauber' | 'korb' | 'maschine';
export type TeilStatus = 'aktiv' | 'aussortiert' | 'verkauft' | 'weggegeben';
export type Zustand = 'neu_mit_etikett' | 'sehr_gut' | 'gut' | 'getragen';

export type GroessenQuelle = 'etikett' | 'hand' | 'geschaetzt';
export type GroessenSystem = 'alpha' | 'eu_konfektion' | 'weite_laenge' | 'schuh_eu';

export type StilTag =
  | 'clean' | 'streetwear' | 'business_casual' | 'klassisch'
  | 'sportlich' | 'outdoor' | 'vintage';

// Feste Unterart-Liste je Kategorie, nötig für "höchstens ein Schmuckteil je Unterart"
export const UNTERARTEN = {
  oberteil: ['tshirt', 'hemd', 'bluse', 'polo', 'pullover', 'hoodie', 'strickjacke', 'top', 'sonstiges'],
  hose: ['jeans', 'chino', 'anzughose', 'jogginghose', 'shorts', 'rock', 'sonstiges'],
  jacke: ['sakko', 'blazer', 'regenjacke', 'daunenjacke', 'mantel', 'lederjacke', 'jeansjacke', 'sonstiges'],
  schuhe: ['sneaker', 'stiefel', 'anzugschuh', 'sandale', 'sportschuh', 'sonstiges'],
  accessoire: ['guertel', 'muetze', 'schal', 'tasche', 'uhr', 'sonnenbrille', 'sonstiges'],
  schmuck: ['kette', 'ring', 'armband', 'ohrring', 'sonstiges'],
} as const satisfies Record<Kategorie, readonly string[]>;
export type Unterart = (typeof UNTERARTEN)[Kategorie][number];

// ---------- Synchronisierbare Basis ----------
export interface Synchronisiert {
  id: Uuid;                       // wird auf dem Gerät erzeugt (local-first)
  angelegtAm: IsoZeitpunkt;
  zuletztGeaendert: IsoZeitpunkt; // Uhr des Geräts, entscheidet bei Konflikten
  geloescht: boolean;             // sanftes Löschen
}

// ---------- Kleidungsstück ----------
export interface Kleidungsstueck extends Synchronisiert {
  name: string;
  kategorie: Kategorie;
  unterart: Unterart | null;

  farbeHex: string;               // "#1F3A5F"
  farbeName: string;              // "Marine"
  nebenfarbeHex: string | null;
  nebenfarbeName: string | null;
  muster: Muster;                 // Standard 'uni'
  material: string | null;

  waermegrad: Waermegrad;         // Standard 1
  formalitaet: Formalitaet;       // Standard 0
  regentauglich: boolean;         // Standard false
  stilTags: StilTag[];            // Standard []

  groesseText: string | null;     // wie auf dem Etikett: "M / 50"
  groesseSystem: GroessenSystem | null;
  groesseNormiert: string | null; // "M", "50", "32/32", "43"
  groesseQuelle: GroessenQuelle | null;

  metallton: Metallton | null;    // nur bei Schmuck gesetzt

  waeschestatus: Waeschestatus;           // Standard 'sauber'
  gewaschenAm: IsoZeitpunkt | null;       // letzter Wechsel auf 'sauber'
  waescheschwelleEigen: number | null;    // überschreibt die Kategorie, 0 = nie waschen

  marke: string | null;
  kaufpreisCent: number | null;
  kaufdatum: LokalesDatum | null;

  status: TeilStatus;                     // Standard 'aktiv'
  statusSeit: IsoZeitpunkt | null;
  verkaufspreisCent: number | null;
  zustand: Zustand | null;
  aussortierFrageNichtVor: LokalesDatum | null; // nach "Behalten" oder "Später erinnern"

  bildPfad: string | null;                // Speicherpfad im Bucket "benutzer_id/teil_id"
  bildPruefsumme: string | null;          // SHA-256 der Anzeigefassung
}

// Nur lokal, wird nie synchronisiert
export interface KleidungsstueckLokal {
  teilId: Uuid;
  bildLokalUri: string | null;            // Anzeigefassung auf dem Gerät
  originalLokalUri: string | null;        // Original, verlässt nie das Gerät
}

// Abgeleitet, wird nicht gespeichert (siehe Abweichung 3)
export interface Tragestatistik {
  getragenSeitWaesche: number;
  getragenGesamt: number;
  zuletztGetragen: LokalesDatum | null;
}

// ---------- Outfit ----------
export type Bewertung = 'gefaellt' | 'abgelehnt' | 'offen';
export type Rolle = 'oberteil' | 'hose' | 'jacke' | 'schuhe' | 'accessoire' | 'schmuck';
export type AnlassQuelle = 'termin' | 'alltag' | 'manuell';

export interface Outfit extends Synchronisiert {
  datum: LokalesDatum;
  anlass: AnlassQuelle;
  anlassFormalitaet: Formalitaet;
  bewertung: Bewertung;              // Standard 'offen'
  istTageswahl: boolean;             // Standard false
  getragen: boolean;                 // Standard false
  kombinationsSchluessel: string;    // sortierte Teil-IDs, gehasht
  titel: string | null;
  begruendung: string | null;
  begruendungQuelle: 'regel' | 'ki' | null;
  regelScore: number | null;
  stilHeute: StilTag | null;
}

export interface OutfitTeil extends Synchronisiert {
  outfitId: Uuid;
  teilId: Uuid;
  rolle: Rolle;
}

// ---------- Trageeintrag ----------
export interface TrageEintrag extends Synchronisiert {
  teilId: Uuid;
  outfitId: Uuid | null;     // null, wenn ein Teil einzeln als getragen markiert wird
  datum: LokalesDatum;       // eindeutig je (Teil, Datum)
}

// ---------- Wäscheschwelle ----------
export interface Waescheschwelle {
  kategorie: Kategorie;      // Schlüssel zusammen mit dem Benutzer
  schwelle: number;          // 0 = wird nie gewaschen
  zuletztGeaendert: IsoZeitpunkt;
  geloescht: boolean;
}
export const STANDARD_SCHWELLEN: Record<Kategorie, number> = {
  oberteil: 1, hose: 4, jacke: 10, schuhe: 30, accessoire: 5, schmuck: 0,
};

// ---------- Größenprofil ----------
export type Koerperbereich = 'oberteil' | 'hose' | 'schuhe' | 'konfektion';
export interface Groessenprofil {
  bereich: Koerperbereich;   // Schlüssel zusammen mit dem Benutzer
  system: GroessenSystem;
  werte: string[];           // mehrere erlaubt: ["M", "L"]
  zuletztGeaendert: IsoZeitpunkt;
  geloescht: boolean;
}

// ---------- Stilprofil ----------
export type Gewichtung = 'hauptsaechlich' | 'manchmal';
export interface Stilprofil {
  stil: StilTag;             // Schlüssel zusammen mit dem Benutzer
  gewichtung: Gewichtung;
  zuletztGeaendert: IsoZeitpunkt;
  geloescht: boolean;
}

// ---------- Einstellungen (Ergänzung, siehe Abweichung 8) ----------
export interface Einstellungen {
  alltagsFormalitaet: Formalitaet;          // Standard 0, gilt ohne Termin (A5)
  aussortierNachMonaten: number;            // Standard 9 (E-1)
  abendvorschauUhrzeit: string | null;      // "20:00" (G2)
  ortManuell: { name: string; breite: number; laenge: number } | null;
  rundtourAbgeschlossen: boolean;
  zuletztGeaendert: IsoZeitpunkt;
}
```

### Abweichungen von der Beschreibung in A1

| # | Beschreibung in A1 | Umsetzung | Begründung |
|---|---|---|---|
| 1 | `imKorb`, `inDerMaschine` als zwei Felder | ein Feld `waeschestatus: 'sauber' \| 'korb' \| 'maschine'` | Zwei Booleans erlauben den unsinnigen Zustand „im Korb und in der Maschine“. Ein einziges Feld macht ungültige Zustände unmöglich. |
| 2 | „Größe als Text, normierte Größe, Quelle“ | zusätzlich `groesseSystem` | „50“ kann EU-Konfektion oder eine Schuhgröße sein. Ohne System lässt sich nicht gegen das Größenprofil vergleichen. |
| 3 | `getragenSeitWaesche`, `getragenGesamt`, `zuletztGetragen` als gespeicherte Felder | aus `TrageEintrag` abgeleitet; gespeichert wird nur `gewaschenAm` | Zähler und „jüngerer Zeitstempel gewinnt“ vertragen sich nicht: Tragen zwei Geräte dasselbe Teil, überschreibt eines das andere und ein Tragen geht verloren. Aus den Einträgen gezählt ist das Ergebnis immer richtig. `getragenSeitWaesche` = Einträge nach `gewaschenAm`. |
| 4 | „bestätigte Größe“ | kein eigenes Feld; bestätigt ist jede Größe mit Quelle `etikett` oder `hand` | Laut C4 wird nichts ohne Bestätigung gespeichert. Die einzige unbestätigte Quelle ist `geschaetzt`. Ein zweites Feld könnte dem widersprechen. |
| 5 | Kaufpreis | `kaufpreisCent` als Ganzzahl | Gleitkommazahlen runden bei Geldbeträgen falsch. |
| 6 | Status „mit Datum“ | `statusSeit` | Wie beschrieben; nur benannt. |
| 7 | nicht in A1 | `verkaufspreisCent`, `zustand`, `aussortierFrageNichtVor` | Diese Felder brauchen E-1, E-2 und G1. Sie kommen jetzt dazu, damit später keine Migration nötig ist. Alle sind optional. |
| 8 | nicht in A1 | Modell `Einstellungen` | A5 (Alltagswert), E-1 (neun Monate) und G2 (Uhrzeit) brauchen synchronisierte Einstellungen. |
| 9 | Outfit „Teile“ | Zuordnung `OutfitTeil` mit `rolle`, dazu `kombinationsSchluessel`, `titel`, `begruendung` | Die Sperre für „identische Kombination in 14 Tagen“ braucht einen vergleichbaren Schlüssel. Die Tageswahl muss ihre Begründung nach einem Neustart noch zeigen können. |
| 10 | „Bild in Anzeigefassung, Original nur lokal“ | geteilt in `bildPfad` + `bildPruefsumme` (synchronisiert) und `KleidungsstueckLokal` (nie synchronisiert) | So kann der Typ für den Sync den Pfad des Originals gar nicht erst enthalten. |
| 11 | Unterart als freier Text | feste Liste je Kategorie mit `sonstiges` | Die Schmuckregel „ein Teil je Unterart“ und die KI-Erkennung (C3) brauchen feste Werte. |
| 12 | Wäscheschwelle Schmuck 0 | 0 bedeutet „wird nie gewaschen“ | Wie vorgegeben. Ich halte es fest, weil 0 sonst nach jedem Tragen in den Korb führen würde. |

---

## 2. Supabase-Schema (A0) – Entwurf, noch nicht ausgeführt

### Allgemeine Regeln

- Primärschlüssel `id uuid` wird **auf dem Gerät** erzeugt. Das ist Voraussetzung für local-first.
- Jede Tabelle hat `benutzer_id uuid not null references auth.users(id) on delete cascade`,
  `angelegt_am`, `zuletzt_geaendert timestamptz`, `geloescht boolean default false`.
- **Ergänzung `server_geaendert timestamptz`**, gesetzt per Trigger auf `now()`. Der Sync
  liest neue Daten über `server_geaendert > letzter Abruf`. Konflikte entscheidet weiterhin
  `zuletzt_geaendert`. Begründung: Geht die Uhr eines Geräts nach, schreibt es Zeilen mit
  „alter“ Zeit. Ein Abruf nach `zuletzt_geaendert` würde sie auf anderen Geräten nie finden.
- Ein Trigger `lww_schutz` verwirft ein Update, wenn das eingehende `zuletzt_geaendert`
  älter ist als das gespeicherte. Damit gilt „jüngerer Zeitstempel gewinnt“ serverseitig.
- Aufzählungen als `text` mit `check`-Constraint statt Postgres-`enum`. Enums lassen sich
  in wiederholbaren Skripten schlecht erweitern.
- Fremdschlüssel zwischen Benutzertabellen laufen über `(benutzer_id, id)`. So kann kein
  Outfit auf das Teil eines fremden Kontos zeigen. Fremdschlüsselprüfungen umgehen RLS.
- Index auf `(benutzer_id, server_geaendert)` in jeder synchronisierten Tabelle.
- Wiederholbar: `create table if not exists`, `create or replace function`,
  `drop trigger if exists` / `drop policy if exists` vor jedem `create`.

### Tabellen

| Tabelle | Schlüssel | Spalten (Typ, Default) | Policies |
|---|---|---|---|
| `kleidungsstueck` | PK `id`; unique `(benutzer_id, id)` | name text not null · kategorie text check · unterart text · farbe_hex text · farbe_name text · nebenfarbe_hex text · nebenfarbe_name text · muster text default 'uni' · material text · waermegrad smallint 0–3 default 1 · formalitaet smallint 0–3 default 0 · regentauglich bool default false · stil_tags text[] default '{}' · groesse_text text · groesse_system text · groesse_normiert text · groesse_quelle text check · metallton text check · waeschestatus text default 'sauber' · gewaschen_am timestamptz · waescheschwelle_eigen smallint ≥ 0 · marke text · kaufpreis_cent int · kaufdatum date · status text default 'aktiv' · status_seit timestamptz · verkaufspreis_cent int · zustand text · aussortier_frage_nicht_vor date · bild_pfad text · bild_pruefsumme text + Sync-Spalten | select/insert/update/delete: `auth.uid() = benutzer_id` |
| `outfit` | PK `id`; unique `(benutzer_id, id)` | datum date · anlass text · anlass_formalitaet smallint · bewertung text default 'offen' · ist_tageswahl bool default false · getragen bool default false · kombinations_schluessel text · titel text · begruendung text · begruendung_quelle text · regel_score int · stil_heute text + Sync | wie oben |
| `outfit_teil` | PK `id`; unique `(outfit_id, teil_id)`; FK `(benutzer_id, outfit_id)` → outfit, `(benutzer_id, teil_id)` → kleidungsstueck | rolle text check + Sync | wie oben |
| `trage_eintrag` | PK `id`; **unique `(benutzer_id, teil_id, datum)`**; FK wie oben | teil_id uuid · outfit_id uuid null · datum date + Sync | wie oben |
| `waescheschwelle` | PK `(benutzer_id, kategorie)` | schwelle smallint ≥ 0 + Sync (ohne id) | wie oben |
| `groessenprofil` | PK `(benutzer_id, bereich)` | system text · werte text[] + Sync | wie oben |
| `stilprofil` | PK `(benutzer_id, stil)` | gewichtung text check + Sync | wie oben |
| `einstellungen` | PK `benutzer_id` | alltags_formalitaet smallint default 0 · aussortier_nach_monaten smallint default 9 · abendvorschau_uhrzeit time · ort_manuell jsonb · rundtour_abgeschlossen bool + Sync | wie oben |
| `ki_nutzung` | PK `(benutzer_id, datum, art)` | art text ('sortierung','erkennung') · anzahl int default 0 | **nur select** für den Besitzer. Schreiben ausschließlich per Service-Rolle in der Edge Function. |
| `ki_protokoll` | PK `id` (bigint identity) | benutzer_id · zeitpunkt · art · modell · tokens_ein int · tokens_aus int · kosten_mikro_usd int · dauer_ms int · erfolg bool | **keine** Client-Policy; nur Service-Rolle |
| `ki_cache` | PK `(benutzer_id, datum, bestands_pruefsumme)` | antwort jsonb · angelegt_am | **keine** Client-Policy; nur Service-Rolle |
| `abo_status` | PK `benutzer_id` | ist_plus bool default false · gueltig_bis timestamptz · produkt text · quelle text · aktualisiert timestamptz | **nur select** für den Besitzer. Geschrieben vom RevenueCat-Webhook (Service-Rolle). |
| `kaufentscheidung` | – | erst nach Freigabe von G4 (E12) | – |

**Abweichung bei den Policies:** Der Auftrag verlangt für jede Tabelle select, insert,
update und delete auf `auth.uid() = benutzer_id`. Bei `ki_nutzung` und `abo_status` würde
das jedem Nutzer erlauben, seinen eigenen Tageszähler zurückzusetzen oder sich selbst Plus
zu geben. Diese Tabellen bekommen deshalb RLS mit **nur** einer select-Policy. `ki_protokoll`
und `ki_cache` bekommen RLS ganz ohne Client-Policy. Schreiben geht nur über die
Service-Rolle in Edge Functions. RLS ist trotzdem auf jeder Tabelle aktiv.

### Storage

- Bucket `kleidung`, privat (`public = false`), Dateigrößenlimit 150 KB, nur `image/jpeg` und `image/webp`.
- Pfad `benutzer_id/teil_id.jpg`.
- Policies auf `storage.objects` für select, insert, update und delete:
  `bucket_id = 'kleidung' and (storage.foldername(name))[1] = auth.uid()::text`.
- Vorschlag für Block F: Die insert-Policy prüft zusätzlich `abo_status.ist_plus`. Free lädt
  ohnehin nichts hoch. So kann ein manipulierter Client aber keinen Speicher verbrauchen.
  Die Entscheidung fällt bei E11.

### Edge Functions (Gerüst in A0)

| Funktion | Zweck | Secrets |
|---|---|---|
| `ki-sortierung` | B4: Identität prüfen, Plus prüfen, Tageszähler atomar erhöhen, Cache prüfen, Modell aufrufen, Antwort validieren, Kosten protokollieren | Schlüssel des Modellanbieters |
| `konto-loeschen` | A3: Bilder im Ordner löschen, `auth.admin.deleteUser`; Cascade entfernt alle Zeilen | Service-Rolle (automatisch vorhanden) |
| `wetter` (A4) | Zwischenspeicher für die Wetter-API. Bei MET Norway ist das Pflicht (siehe E2). | ggf. API-Schlüssel |
| `abo-webhook` (F) | RevenueCat meldet Käufe und Kündigungen, schreibt `abo_status` | Webhook-Geheimnis |
| `ki-erkennung` (C3) | wie `ki-sortierung`, für Bilder | Schlüssel des Modellanbieters |

### Migrationsskripte

```
supabase/migrations/
  001_hilfsfunktionen.sql      Trigger-Funktionen server_geaendert und lww_schutz
  002_kleidungsstueck.sql
  003_outfit.sql               outfit + outfit_teil
  004_trage_eintrag.sql
  005_profile.sql              waescheschwelle, groessenprofil, stilprofil, einstellungen
  006_ki.sql                   ki_nutzung, ki_protokoll, ki_cache, Funktion ki_zaehler_erhoehen
  007_abo.sql                  abo_status
  008_storage.sql              Bucket und Storage-Policies
  099_pruefung.sql             schlägt fehl, wenn eine Tabelle in public kein RLS hat
```

### Lokales Schema (Drizzle/SQLite) – Unterschiede zu Supabase

| Unterschied | Lokal | Supabase | Grund |
|---|---|---|---|
| Besitzer | keine Spalte `benutzer_id`; eine Datenbankdatei je Schrank, Konto-ID in Tabelle `sync_meta` | `benutzer_id` in jeder Tabelle | Ohne Konto gibt es keine ID. „Schrank beiseitelegen“ heißt: Datei umbenennen und neu anfangen. Es wird nichts gelöscht. |
| Sync-Status | `sync_offen` (0/1) je Zeile, Abrufzeitpunkt je Tabelle in `sync_meta` | `server_geaendert` | Nur das Gerät muss wissen, was noch hochzuladen ist. |
| Nur lokal | Tabelle `teil_lokal` (bildLokalUri, originalLokalUri), Wetter-Cache, Tageswahl-Cache | – | Originale verlassen das Gerät nie. |
| Datentypen | Listen als JSON-Text, Booleans als 0/1, Zeitpunkte als ISO-Text | `text[]`, `boolean`, `timestamptz` | SQLite kennt diese Typen nicht. Die Umrechnung liegt an einer Stelle (`src/data/sync/mapper.ts`). |
| Nur Server | – | `ki_*`, `abo_status` | Werden nie synchronisiert. |

---

## 3. Stack

| Zweck | Festlegung | Abweichung / Begründung | Expo Go |
|---|---|---|---|
| Gerüst | Expo, aktuelle SDK (beim Anlegen mit `create-expo-app@latest` festgelegt, Stand der Recherche SDK 56/57), TypeScript `strict` + `noUncheckedIndexedAccess` | – | ja |
| Navigation | expo-router, Tabs Heute · Outfit · Schrank · Wäsche · Einstellungen | – | ja |
| Lokale DB | expo-sqlite + Drizzle ORM, Migrationen per `useMigrations` | – | ja |
| Backend | `@supabase/supabase-js`, Sitzung in expo-secure-store | – | ja |
| Kamera/Fotos | expo-image-picker (Mehrfachauswahl), expo-camera (Etikett) | – | ja |
| Bildbearbeitung | expo-image-manipulator + **@shopify/react-native-skia** | **Ergänzung:** Der Manipulator kann zuschneiden und komprimieren, aber nicht auf neutralen Grund setzen. Skia kann das und läuft in Expo Go. | ja |
| Bildanzeige | **expo-image** | **Ergänzung:** Bild-Cache für die Gitteransicht | ja |
| Dateien/Prüfsumme | expo-file-system, **expo-crypto** | **Ergänzung:** SHA-256 für „Upload nur bei geändertem Bild“ | ja |
| Swipe | **react-native-gesture-handler + reanimated** | **Ergänzung:** für den Kartenstapel (B2) | ja |
| Validierung | **zod** | **Ergänzung:** KI-Antworten und Sync-Daten strikt prüfen. Gleiches Schema in den Edge Functions (Deno, `npm:zod`). | ja |
| Standort | expo-location, `Accuracy.Low`; Koordinaten vor dem Versand auf 2 Nachkommastellen gerundet (ca. 1 km) | Rundung ergänzt | ja |
| Kalender | expo-calendar, nur lesend | – | ja |
| Mitteilungen | expo-notifications, nur lokal | – | ja (lokale Mitteilungen) |
| Teilen | **expo-sharing, expo-clipboard**, `Linking` | **Ergänzung** für E-2 | ja |
| Käufe | RevenueCat (`react-native-purchases`) | bestätigt. In Expo Go läuft ein „Preview API Mode“ mit Attrappen. Echte Käufe brauchen einen Development Build. Kosten: kostenlos bis 2.500 $ Monatsumsatz, danach 1 %. **Wiederkehrende Kosten und Datenfluss zu RevenueCat** (anonyme App-Nutzer-ID, Käufe). | Attrappe |
| Zustand | kein Redux/Zustand; Drizzle `useLiveQuery` + schlanker React-Context | Abweichung: keine Zustandsbibliothek. Die Datenbank ist die Wahrheit, eine zweite Kopie im Speicher würde nur auseinanderlaufen. | ja |
| Gestaltung | eigene Tokens in `src/ui/theme/tokens.ts`, hell/dunkel | – | ja |
| Tests | **Vitest** für `src/domain` | Die Fachlogik ist reines TypeScript. Vitest braucht keine React-Native-Transformation und ist schnell. UI-Tests vorerst keine. | – |
| Qualität | ESLint (`eslint-config-expo`) + Prettier, `npm run lint / format / test / typecheck` | – | – |

---

## 4. Was der Plattformwechsel kostet – Optionen mit Kosten

Formale Entscheidungsvorlagen stehen in der Chat-Antwort (E2, E3, E8). Hier die Übersicht:

| Punkt | Option | Kosten | Expo Go? | Datenfluss zu Dritten |
|---|---|---|---|---|
| **Wetter (E2)** | MET Norway über eigenen Proxy | 0 €, CC BY 4.0, kommerziell erlaubt; Pflicht: Namensnennung, User-Agent, Proxy mit Cache für Apps; bis 20 Anfragen/s | ja | gerundete Koordinaten an met.no |
| | Open-Meteo Standard | 29 $/Monat für 1 Mio. Aufrufe. Gratis-Stufe nur nichtkommerziell, also hier **nicht zulässig**. | ja | gerundete Koordinaten |
| | OpenWeather One Call 3.0 | 1.000 Aufrufe/Tag gratis, dann 0,0015 $/Aufruf. Ohne Tageslimit im Konto wird einfach weiter abgerechnet. | ja | gerundete Koordinaten |
| **Freistellen (E3)** | Server: Segmentierungsmodell bei einem Hoster (z. B. Replicate) | grob 0,002–0,01 $/Bild (zu verifizieren) | ja | Foto verlässt das Gerät |
| | Kommerzieller Dienst: Photoroom-API / remove.bg | ca. 0,02 $/Bild bzw. ca. 0,20 $/Bild | ja | Foto verlässt das Gerät |
| | Natives Modul: iOS Vision + Android ML Kit Subject Segmentation (Kandidat `react-native-subject-lift`, sonst eigenes Expo-Modul) | 0 € laufend; Aufwand 1–2 Tage mit fertigem Modul, 5–8 mit eigenem. iOS ab 17. Kein Mac nötig, EAS baut in der Cloud. Fehlersuche in Swift ohne Mac ist aber mühsam. | **nein**, Development Build | keiner |
| | Nicht freistellen, nur quadratisch auf neutralen Grund | 0 € | ja | keiner |
| **Texterkennung (E8)** | On-device: Expo-Modul mit ML Kit/Vision (z. B. `expo-mlkit-ocr`, `@infinitered/react-native-mlkit`) | 0 € laufend, 1–2 Tage | **nein** | keiner |
| | Server: Etikettbild über den KI-Proxy | ca. 0,003–0,01 $/Etikett | ja | Etikettfoto an den Modellanbieter |
| **Widget (G2)** | iOS: WidgetKit per `expo-apple-targets` (Swift); Android: `react-native-android-widget` | 0 € laufend; ca. 3–5 Tage iOS, 2–3 Tage Android | **nein** | keiner |
| **Teilen-Erweiterung (G4)** | `expo-share-intent` (Link empfangen) + Auswertung der Produktseite | 0 € laufend; 1–2 Tage für den Empfang, 3–4 für die Auswertung | **nein** | Produktlink an den Shop bzw. den Proxy |

### Apple-Konto

Für Development Builds auf dem iPhone und für den App Store ist das
Apple-Developer-Programm nötig: **99 $/Jahr, wiederkehrend**. Android braucht das nicht
(Google Play: einmalig 25 $).

### Wo Expo Go endet

Mit den empfohlenen Optionen (E2 MET Norway, E3 erst zuschneiden, E8 erst von Hand)
läuft **alles bis einschließlich Block E in Expo Go**. **Expo Go endet mit Block F**, weil
echte Käufe einen Development Build brauchen. Ab dann kommen auch die nativen Module für
Freistellen und Texterkennung dazu, ohne zusätzlichen Wechsel. Fällt bei E3 oder E8 die
Wahl auf „nativ sofort“, endet Expo Go schon bei C2 bzw. C4.

---

## 5. Projektstruktur

```
/
├─ app/                          Oberfläche (expo-router), nur Darstellung
│  ├─ _layout.tsx
│  ├─ (tabs)/
│  │  ├─ _layout.tsx             Heute · Outfit · Schrank · Wäsche · Einstellungen
│  │  ├─ index.tsx               Heute
│  │  ├─ outfit.tsx
│  │  ├─ schrank/ index.tsx, [id].tsx, neu.tsx, aussortiert.tsx
│  │  ├─ waesche.tsx
│  │  └─ einstellungen/ index.tsx, konto.tsx, groessen.tsx, stile.tsx, abo.tsx
│  └─ rundtour/ ...
├─ src/
│  ├─ domain/                    FACHLOGIK – reines TypeScript, kein React, kein Expo, deutsch
│  │  ├─ modell/                 typen.ts, konstanten.ts, unterarten.ts
│  │  ├─ waesche/                waescheregel.ts (tragen, Schwelle, Korb, waschen)
│  │  ├─ engine/                 ← DIE EINE ENGINE
│  │  │  ├─ gewichte.ts          alle Gewichte als Konstanten an einer Stelle
│  │  │  ├─ hartefilter.ts
│  │  │  ├─ farbharmonie.ts      HSB, Farbfamilien, Neutrale
│  │  │  ├─ schmuck.ts
│  │  │  ├─ bewertung.ts
│  │  │  ├─ kandidaten.ts        Einstieg: kandidatenFuerTag(eingabe) → Top 10
│  │  │  ├─ zufall.ts            Zufall mit Startwert aus Datum + Bestand (deterministisch)
│  │  │  └─ begruendung.ts       Textbausteine ohne KI
│  │  ├─ lernen/                 feedbackgewichte.ts
│  │  ├─ wetter/                 gefuehlteTemperatur.ts, zielwaerme.ts
│  │  ├─ kalender/               formalitaetAusTermin.ts (Schlüsselwörter)
│  │  ├─ groesse/                etikettParser.ts, groessenvergleich.ts
│  │  ├─ aussortieren/           vorschlaege.ts
│  │  ├─ verkauf/                anzeigenentwurf.ts
│  │  └─ **/*.test.ts            Vitest, neben dem Code
│  ├─ data/                      Datenzugriff (englisch)
│  │  ├─ db/ client.ts, schema.ts, migrations/
│  │  ├─ repositories/           garment, outfit, wear, profile …
│  │  └─ sync/ syncEngine.ts, mapper.ts, imageUpload.ts
│  ├─ services/                  Dienste nach außen (englisch)
│  │  ├─ supabase.ts, auth.ts, weather.ts, location.ts, calendar.ts,
│  │  ├─ images.ts, ai.ts, purchases.ts (einziges Flag istPlus), notifications.ts
│  ├─ hooks/                     verbinden domain + data mit der Oberfläche
│  └─ ui/ theme/tokens.ts, components/
├─ supabase/
│  ├─ migrations/ 001…099
│  └─ functions/ _shared/, ki-sortierung/, ki-erkennung/, konto-loeschen/, wetter/, abo-webhook/
├─ docs/
├─ SETUP.md, .env.example, .gitignore
```

Regeln:

- `src/domain` importiert nichts aus `react`, `expo-*`, `src/data` oder `src/services`.
  Eine ESLint-Regel (`no-restricted-imports`) erzwingt das.
- Die Engine bekommt alles als einfache Daten herein: Bestand, Wetter, Anlass, Profile,
  Feedback, Datum. Sie liefert die sortierte Liste. Heute- und Outfit-Screen lesen dieselbe
  Liste über einen Hook `useTageskandidaten()`.
- Die KI-Schicht ist ein nachgeschalteter Dienst (`services/ai.ts`). Sie sortiert nur um
  und fällt nach wenigen Sekunden still auf die Engine-Reihenfolge zurück.

---

## 6. Umsetzungsplan A bis G

Aufwand in Arbeitstagen für die Umsetzung. Deine Testzeit kommt dazu.

| Block | Inhalt | Aufwand | Expo Go | Entscheidung |
|---|---|---|---|---|
| A0 | Expo-Gerüst, Tabs, Tokens, Lint/Test, alle SQL-Skripte, Edge-Function-Gerüste, SETUP.md | 2–3 | ja | – |
| A1 | Drizzle-Schema, Migrationen, Repositories, Wäscheregel + Tests | 2 | ja | – |
| A2 | Anonyme/optionale Identität, Sync aller Tabellen, Bild-Upload, Kontowechsel, Rechnung Free-Plan | 4–5 | ja | **E1** |
| A3 | Registrierung/Anmeldung, Kontolöschung (Edge Function), Datenexport (JSON + Bilder als ZIP) | 2 | ja | – |
| A4 | Wetter-Proxy, gefühlte Temperatur, Cache 2 h, Ort von Hand | 2 | ja | **E2** |
| A5 | Kalender lesen, Filter für ganztägige/abonnierte Einträge, Formalität + Tests | 1 | ja | – |
| B1 | Engine: harte Filter, Bewertung, Farbharmonie, Schmuck, Determinismus, Textbausteine + Tests | 4–5 | ja | – |
| B2 | Swipe-Stapel, Tageswahl, Heute-Screen, Mitternachtswechsel | 3 | ja | E10 (vorläufiger Wert) |
| B3 | Feedback speichern, gleitende Gewichte | 1,5 | ja | – |
| B4 | KI-Proxy `ki-sortierung`, Zähler, Cache, Validierung, Fallback | 2–3 | ja | **E4, E5** |
| C1 | Fotos, Anzeigefassung, Gitteransicht | 2–3 | ja | – |
| C2 | Freistellen | 0,5 (Zuschnitt) / 2–8 (nativ) | je nach E3 | **E3** |
| C3 | KI-Erkennung, Maske mit Zuversicht | 2–3 | ja | **E6** |
| C4 | Etikett-Parser + Tests, Texterkennung | 2 + 1–2 | je nach E8 | **E7, E8** |
| D | Rundtour, Größenprofil, Stilprofile | 3–4 | ja | – |
| E | Aussortieren, Verkaufsentwurf | 3 | ja | **E9** |
| F | RevenueCat, `istPlus`, Paywall, Webhook, Gating, Store-Testkonten | 3–4 | **nein – ab hier Development Build** | **E10, E11** |
| G | einzeln: G1 1,5 · G2 1 + Widget 5–8 · G3 1 · G4 4–6 | – | G2-Widget/G4 nein | **E12** |

**Summe A–F: ca. 45–55 Arbeitstage.** Größtes Risiko: A2 (Sync mit Konfliktfällen und
Kontowechsel). Deshalb steht er früh und bekommt eigene Tests für die Konfliktregeln.

---

## 7. Kostenrechnung Supabase (Vorgriff auf A2)

Annahmen je Plus-Nutzer mit 100 Teilen:

- Bilder: 100 × ca. 80 KB = **8 MB Storage**
- Datenbank im ersten Jahr: Teile ca. 0,15 MB · ca. 1.500 Swipe-Outfits × ca. 1,2 KB inkl.
  `outfit_teil` und Indizes = ca. 1,8 MB · ca. 1.200 Trageeinträge = ca. 0,2 MB →
  **ca. 2,2 MB/Jahr**
- Egress: Bilder werden auf dem Gerät zwischengespeichert. Ein neues Gerät lädt einmal
  8 MB, dazu kommen Sync-Änderungen. Im Mittel **ca. 2–3 MB/Monat**.

Free-Nutzer synchronisieren nicht. Sie belegen nur Auth-Einträge und `ki_nutzung`-Zeilen,
das ist vernachlässigbar.

| Grenze Free-Plan | Reicht für |
|---|---|
| 1 GB Storage | **ca. 120 Plus-Nutzer** ← der Engpass |
| 500 MB Datenbank (abzgl. ca. 50 MB Systemanteil) | ca. 200 Plus-Nutzer im ersten Jahr |
| 5 GB Egress/Monat | ca. 1.700 Plus-Nutzer |

**Pro-Plan (25 $/Monat)** ist spätestens bei rund 100 Plus-Nutzern fällig. Ich empfehle ihn
aber **ab dem Start mit zahlenden Kunden**: Free-Projekte pausieren nach einer Woche ohne
Aktivität und haben keine Backups. Pro (100 GB Storage, 8 GB DB, 250 GB Egress) trägt ca.
12.000 Plus-Nutzer beim Storage. Gegenrechnung: Ein Jahresabo bringt nach 15 % Apple-Anteil
ca. 21,24 €/Jahr. **Ab ca. 14 Jahresabos ist der Pro-Plan gedeckt.**

---

## 8. Neue Datenflüsse zu Drittanbietern (für die Datenschutzerklärung)

| Anbieter | Was | Ab Block |
|---|---|---|
| Supabase | Konto (bei E1 ggf. anonym), synchronisierte Daten, Anzeigebilder (nur Plus) | A2 |
| Wetterdienst (je nach E2) | auf ca. 1 km gerundete Koordinaten, über den eigenen Proxy | A4 |
| Modellanbieter (je nach E4) | abstrakte Wetter-/Anlasswerte + Teilbeschreibungen; keine Termine, Orte, Kontakte | B4 |
| Modellanbieter (C3) | freigestellte/zugeschnittene Motive, nie Originale | C3 |
| Freisteller (nur bei E3 = Server/Dienst) | Kleidungsfoto | C2 |
| RevenueCat, Apple, Google | anonyme App-Nutzer-ID, Kaufdaten | F |
