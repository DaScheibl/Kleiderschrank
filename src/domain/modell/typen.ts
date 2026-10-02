// ---------- Grundtypen ----------
export type Uuid = string;
/** ISO-8601 in UTC, z. B. "2026-10-02T07:15:00.000Z" */
export type IsoZeitpunkt = string;
/** Kalendertag in der Zeitzone des Geräts, z. B. "2026-10-02" */
export type LokalesDatum = string;

export const KATEGORIEN = ['oberteil', 'hose', 'jacke', 'schuhe', 'accessoire', 'schmuck'] as const;
export type Kategorie = (typeof KATEGORIEN)[number];

/** 0 Sommer, 1 Übergang, 2 kühl, 3 Winter */
export type Waermegrad = 0 | 1 | 2 | 3;
/** 0 casual, 1 smart casual, 2 business, 3 förmlich */
export type Formalitaet = 0 | 1 | 2 | 3;

export const MUSTER = ['uni', 'gestreift', 'kariert', 'gepunktet', 'gemustert', 'print'] as const;
export type Muster = (typeof MUSTER)[number];

export const METALLTOENE = ['gold', 'silber', 'rose', 'gemischt', 'keins'] as const;
export type Metallton = (typeof METALLTOENE)[number];

export const WAESCHESTATUS = ['sauber', 'korb', 'maschine'] as const;
export type Waeschestatus = (typeof WAESCHESTATUS)[number];

export const TEIL_STATUS = ['aktiv', 'aussortiert', 'verkauft', 'weggegeben'] as const;
export type TeilStatus = (typeof TEIL_STATUS)[number];

export const ZUSTAENDE = ['neu_mit_etikett', 'sehr_gut', 'gut', 'getragen'] as const;
export type Zustand = (typeof ZUSTAENDE)[number];

export const GROESSEN_QUELLEN = ['etikett', 'hand', 'geschaetzt'] as const;
export type GroessenQuelle = (typeof GROESSEN_QUELLEN)[number];

export const GROESSEN_SYSTEME = ['alpha', 'eu_konfektion', 'weite_laenge', 'schuh_eu'] as const;
export type GroessenSystem = (typeof GROESSEN_SYSTEME)[number];

export const STIL_TAGS = [
  'clean',
  'streetwear',
  'business_casual',
  'klassisch',
  'sportlich',
  'outdoor',
  'vintage',
] as const;
export type StilTag = (typeof STIL_TAGS)[number];

// Feste Liste, weil die Schmuckregel "höchstens ein Teil je Unterart" vergleichbare Werte braucht.
export const UNTERARTEN = {
  oberteil: [
    'tshirt',
    'hemd',
    'bluse',
    'polo',
    'pullover',
    'hoodie',
    'strickjacke',
    'top',
    'sonstiges',
  ],
  hose: ['jeans', 'chino', 'anzughose', 'jogginghose', 'shorts', 'rock', 'sonstiges'],
  jacke: [
    'sakko',
    'blazer',
    'regenjacke',
    'daunenjacke',
    'mantel',
    'lederjacke',
    'jeansjacke',
    'sonstiges',
  ],
  schuhe: ['sneaker', 'stiefel', 'anzugschuh', 'sandale', 'sportschuh', 'sonstiges'],
  accessoire: ['guertel', 'muetze', 'schal', 'tasche', 'uhr', 'sonnenbrille', 'sonstiges'],
  schmuck: ['kette', 'ring', 'armband', 'ohrring', 'sonstiges'],
} as const satisfies Record<Kategorie, readonly string[]>;
export type Unterart = (typeof UNTERARTEN)[Kategorie][number];

// ---------- Synchronisierbare Basis ----------
export interface Synchronisiert {
  /** Wird auf dem Gerät erzeugt (local-first). */
  id: Uuid;
  angelegtAm: IsoZeitpunkt;
  /** Uhr des Geräts; bei Konflikten gewinnt der jüngere Wert. */
  zuletztGeaendert: IsoZeitpunkt;
  geloescht: boolean;
}

// ---------- Kleidungsstück ----------
export interface Kleidungsstueck extends Synchronisiert {
  name: string;
  kategorie: Kategorie;
  unterart: Unterart | null;

  farbeHex: string;
  farbeName: string;
  nebenfarbeHex: string | null;
  nebenfarbeName: string | null;
  muster: Muster;
  material: string | null;

  waermegrad: Waermegrad;
  formalitaet: Formalitaet;
  regentauglich: boolean;
  stilTags: StilTag[];

  groesseText: string | null;
  groesseSystem: GroessenSystem | null;
  groesseNormiert: string | null;
  /** Bestätigt ist jede Größe mit Quelle 'etikett' oder 'hand'; 'geschaetzt' nie. */
  groesseQuelle: GroessenQuelle | null;

  metallton: Metallton | null;

  waeschestatus: Waeschestatus;
  /** Letzter Wechsel auf 'sauber'. getragenSeitWaesche zählt Trageeinträge danach. */
  gewaschenAm: IsoZeitpunkt | null;
  /** Überschreibt die Schwelle der Kategorie; 0 = wird nie gewaschen. */
  waescheschwelleEigen: number | null;

  marke: string | null;
  kaufpreisCent: number | null;
  kaufdatum: LokalesDatum | null;

  status: TeilStatus;
  statusSeit: IsoZeitpunkt | null;
  verkaufspreisCent: number | null;
  zustand: Zustand | null;
  aussortierFrageNichtVor: LokalesDatum | null;

  /** Pfad im Storage-Bucket: "benutzer_id/teil_id.jpg" */
  bildPfad: string | null;
  bildPruefsumme: string | null;
}

/** Nur auf dem Gerät, wird nie synchronisiert. */
export interface KleidungsstueckLokal {
  teilId: Uuid;
  bildLokalUri: string | null;
  originalLokalUri: string | null;
}

/** Aus den Trageeinträgen abgeleitet, nie gespeichert. */
export interface Tragestatistik {
  getragenSeitWaesche: number;
  getragenGesamt: number;
  zuletztGetragen: LokalesDatum | null;
}

// ---------- Outfit ----------
export const BEWERTUNGEN = ['gefaellt', 'abgelehnt', 'offen'] as const;
export type Bewertung = (typeof BEWERTUNGEN)[number];

export const ROLLEN = ['oberteil', 'hose', 'jacke', 'schuhe', 'accessoire', 'schmuck'] as const;
export type Rolle = (typeof ROLLEN)[number];

export const ANLASS_QUELLEN = ['termin', 'alltag', 'manuell'] as const;
export type AnlassQuelle = (typeof ANLASS_QUELLEN)[number];

export interface Outfit extends Synchronisiert {
  datum: LokalesDatum;
  anlass: AnlassQuelle;
  anlassFormalitaet: Formalitaet;
  bewertung: Bewertung;
  istTageswahl: boolean;
  getragen: boolean;
  /** Sortierte Teil-IDs, gehasht – erkennt identische Kombinationen. */
  kombinationsSchluessel: string;
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
  /** null, wenn ein Teil einzeln als getragen markiert wird */
  outfitId: Uuid | null;
  /** Eindeutig je (Teil, Datum) */
  datum: LokalesDatum;
}

// ---------- Profile ----------
interface ProfilEintrag {
  angelegtAm: IsoZeitpunkt;
  zuletztGeaendert: IsoZeitpunkt;
  geloescht: boolean;
}

export interface Waescheschwelle extends ProfilEintrag {
  kategorie: Kategorie;
  /** 0 = wird nie gewaschen */
  schwelle: number;
}

export const KOERPERBEREICHE = ['oberteil', 'hose', 'schuhe', 'konfektion'] as const;
export type Koerperbereich = (typeof KOERPERBEREICHE)[number];

export interface Groessenprofil extends ProfilEintrag {
  bereich: Koerperbereich;
  system: GroessenSystem;
  /** Mehrere Werte erlaubt, weil Schnitte verschieden ausfallen. */
  werte: string[];
}

export const GEWICHTUNGEN = ['hauptsaechlich', 'manchmal'] as const;
export type Gewichtung = (typeof GEWICHTUNGEN)[number];

export interface Stilprofil extends ProfilEintrag {
  stil: StilTag;
  gewichtung: Gewichtung;
}

export interface Einstellungen extends ProfilEintrag {
  alltagsFormalitaet: Formalitaet;
  aussortierNachMonaten: number;
  /** "HH:MM" */
  abendvorschauUhrzeit: string | null;
  ortManuell: { name: string; breite: number; laenge: number } | null;
  rundtourAbgeschlossen: boolean;
}
