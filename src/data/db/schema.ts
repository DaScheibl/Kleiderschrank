import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

import type {
  AnlassQuelle,
  Bewertung,
  Einstellungen,
  Formalitaet,
  Gewichtung,
  Koerperbereich,
  Rolle,
  GroessenQuelle,
  GroessenSystem,
  Kategorie,
  Metallton,
  Muster,
  StilTag,
  TeilStatus,
  Unterart,
  Waermegrad,
  Waeschestatus,
  Zustand,
} from '@/domain/modell/typen';

// Spaltennamen entsprechen dem Supabase-Schema (snake_case); Eigenschaften dem Domänentyp.
// Lokal gibt es kein benutzer_id: eine Datenbankdatei gehört genau einem Schrank.
const profilSpalten = {
  angelegtAm: text('angelegt_am').notNull(),
  zuletztGeaendert: text('zuletzt_geaendert').notNull(),
  geloescht: integer('geloescht', { mode: 'boolean' }).notNull().default(false),
  /** Lokale Änderung, die noch nicht zu Supabase übertragen ist. */
  syncOffen: integer('sync_offen', { mode: 'boolean' }).notNull().default(true),
};

const syncSpalten = {
  id: text('id').primaryKey(),
  ...profilSpalten,
};

export const kleidungsstueck = sqliteTable(
  'kleidungsstueck',
  {
    ...syncSpalten,
    name: text('name').notNull(),
    kategorie: text('kategorie').$type<Kategorie>().notNull(),
    unterart: text('unterart').$type<Unterart>(),

    farbeHex: text('farbe_hex').notNull(),
    farbeName: text('farbe_name').notNull(),
    nebenfarbeHex: text('nebenfarbe_hex'),
    nebenfarbeName: text('nebenfarbe_name'),
    muster: text('muster').$type<Muster>().notNull().default('uni'),
    material: text('material'),

    waermegrad: integer('waermegrad').$type<Waermegrad>().notNull().default(1),
    formalitaet: integer('formalitaet').$type<Formalitaet>().notNull().default(0),
    regentauglich: integer('regentauglich', { mode: 'boolean' }).notNull().default(false),
    stilTags: text('stil_tags', { mode: 'json' }).$type<StilTag[]>().notNull().default([]),

    groesseText: text('groesse_text'),
    groesseSystem: text('groesse_system').$type<GroessenSystem>(),
    groesseNormiert: text('groesse_normiert'),
    groesseQuelle: text('groesse_quelle').$type<GroessenQuelle>(),

    metallton: text('metallton').$type<Metallton>(),

    waeschestatus: text('waeschestatus').$type<Waeschestatus>().notNull().default('sauber'),
    gewaschenAm: text('gewaschen_am'),
    waescheschwelleEigen: integer('waescheschwelle_eigen'),

    marke: text('marke'),
    kaufpreisCent: integer('kaufpreis_cent'),
    kaufdatum: text('kaufdatum'),

    status: text('status').$type<TeilStatus>().notNull().default('aktiv'),
    statusSeit: text('status_seit'),
    verkaufspreisCent: integer('verkaufspreis_cent'),
    zustand: text('zustand').$type<Zustand>(),
    aussortierFrageNichtVor: text('aussortier_frage_nicht_vor'),

    bildPfad: text('bild_pfad'),
    bildPruefsumme: text('bild_pruefsumme'),
  },
  (t) => [
    index('kleidungsstueck_kategorie_idx').on(t.kategorie, t.status),
    index('kleidungsstueck_sync_idx').on(t.syncOffen),
  ],
);

export type KleidungsstueckZeile = typeof kleidungsstueck.$inferSelect;

/** Nur auf dem Gerät. Wird nie synchronisiert – das Original verlässt das Gerät nie. */
export const teilLokal = sqliteTable('teil_lokal', {
  teilId: text('teil_id')
    .primaryKey()
    .references(() => kleidungsstueck.id),
  bildLokalUri: text('bild_lokal_uri'),
  originalLokalUri: text('original_lokal_uri'),
});

export const outfit = sqliteTable(
  'outfit',
  {
    ...syncSpalten,
    datum: text('datum').notNull(),
    anlass: text('anlass').$type<AnlassQuelle>().notNull(),
    anlassFormalitaet: integer('anlass_formalitaet').$type<Formalitaet>().notNull(),
    bewertung: text('bewertung').$type<Bewertung>().notNull().default('offen'),
    istTageswahl: integer('ist_tageswahl', { mode: 'boolean' }).notNull().default(false),
    getragen: integer('getragen', { mode: 'boolean' }).notNull().default(false),
    kombinationsSchluessel: text('kombinations_schluessel').notNull(),
    titel: text('titel'),
    begruendung: text('begruendung'),
    begruendungQuelle: text('begruendung_quelle').$type<'regel' | 'ki'>(),
    regelScore: integer('regel_score'),
    stilHeute: text('stil_heute').$type<StilTag>(),
  },
  (t) => [index('outfit_datum_idx').on(t.datum), index('outfit_sync_idx').on(t.syncOffen)],
);

export const outfitTeil = sqliteTable(
  'outfit_teil',
  {
    ...syncSpalten,
    outfitId: text('outfit_id')
      .notNull()
      .references(() => outfit.id),
    teilId: text('teil_id')
      .notNull()
      .references(() => kleidungsstueck.id),
    rolle: text('rolle').$type<Rolle>().notNull(),
  },
  (t) => [
    uniqueIndex('outfit_teil_eindeutig').on(t.outfitId, t.teilId),
    index('outfit_teil_teil_idx').on(t.teilId),
    index('outfit_teil_sync_idx').on(t.syncOffen),
  ],
);

export const trageEintrag = sqliteTable(
  'trage_eintrag',
  {
    ...syncSpalten,
    teilId: text('teil_id')
      .notNull()
      .references(() => kleidungsstueck.id),
    outfitId: text('outfit_id').references(() => outfit.id),
    datum: text('datum').notNull(),
  },
  (t) => [
    // Ein Teil zählt pro Tag nur einmal – wie auf dem Server.
    uniqueIndex('trage_eintrag_eindeutig').on(t.teilId, t.datum),
    index('trage_eintrag_datum_idx').on(t.datum),
    index('trage_eintrag_sync_idx').on(t.syncOffen),
  ],
);

export const waescheschwelle = sqliteTable('waescheschwelle', {
  kategorie: text('kategorie').$type<Kategorie>().primaryKey(),
  schwelle: integer('schwelle').notNull(),
  ...profilSpalten,
});

export const groessenprofil = sqliteTable('groessenprofil', {
  bereich: text('bereich').$type<Koerperbereich>().primaryKey(),
  system: text('system').$type<GroessenSystem>().notNull(),
  werte: text('werte', { mode: 'json' }).$type<string[]>().notNull().default([]),
  ...profilSpalten,
});

export const stilprofil = sqliteTable('stilprofil', {
  stil: text('stil').$type<StilTag>().primaryKey(),
  gewichtung: text('gewichtung').$type<Gewichtung>().notNull(),
  ...profilSpalten,
});

/** Nur lokal: Konto, an das dieser Schrank gebunden ist, und Abrufstände je Tabelle. */
export const syncMeta = sqliteTable('sync_meta', {
  schluessel: text('schluessel').primaryKey(),
  wert: text('wert'),
});

/** Genau eine Zeile mit dem Schlüssel 'standard'. Auf dem Server ist der Schlüssel benutzer_id. */
export const einstellungen = sqliteTable('einstellungen', {
  schluessel: text('schluessel').primaryKey().default('standard'),
  alltagsFormalitaet: integer('alltags_formalitaet').$type<Formalitaet>().notNull().default(0),
  aussortierNachMonaten: integer('aussortier_nach_monaten').notNull().default(9),
  abendvorschauUhrzeit: text('abendvorschau_uhrzeit'),
  ortManuell: text('ort_manuell', { mode: 'json' }).$type<Einstellungen['ortManuell']>(),
  rundtourAbgeschlossen: integer('rundtour_abgeschlossen', { mode: 'boolean' })
    .notNull()
    .default(false),
  ...profilSpalten,
});
