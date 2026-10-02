import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import type {
  Formalitaet,
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
const syncSpalten = {
  id: text('id').primaryKey(),
  angelegtAm: text('angelegt_am').notNull(),
  zuletztGeaendert: text('zuletzt_geaendert').notNull(),
  geloescht: integer('geloescht', { mode: 'boolean' }).notNull().default(false),
  /** Lokale Änderung, die noch nicht zu Supabase übertragen ist. */
  syncOffen: integer('sync_offen', { mode: 'boolean' }).notNull().default(true),
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
