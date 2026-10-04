import type { SQLiteTable } from 'drizzle-orm/sqlite-core';

import {
  einstellungen,
  groessenprofil,
  kleidungsstueck,
  outfit,
  outfitTeil,
  stilprofil,
  trageEintrag,
  waescheschwelle,
} from '../db/schema';

export interface SyncTable {
  /** Tabellenname in Supabase */
  name: string;
  table: SQLiteTable;
  /** Fachlicher Schlüssel (Eigenschaftsnamen), über den lokale und entfernte Zeilen zusammenfinden */
  key: readonly string[];
  /** Spalten für ON CONFLICT beim Hochladen */
  remoteConflict: string;
  /** Mit id seitenweise abrufen; kleine Profiltabellen ohne id kommen in einem Stück. */
  paged: boolean;
  /** Nur lokal vorhandene Eigenschaften mit ihrem festen Wert */
  localOnly?: Readonly<Record<string, unknown>>;
}

// Reihenfolge = Abhängigkeiten: erst Teile, dann was auf Teile verweist.
export const SYNC_TABLES: readonly SyncTable[] = [
  {
    name: 'kleidungsstueck',
    table: kleidungsstueck,
    key: ['id'],
    remoteConflict: 'id',
    paged: true,
  },
  { name: 'outfit', table: outfit, key: ['id'], remoteConflict: 'id', paged: true },
  { name: 'outfit_teil', table: outfitTeil, key: ['id'], remoteConflict: 'id', paged: true },
  {
    // Zwei Geräte können dasselbe Teil am selben Tag eintragen – mit verschiedenen ids.
    name: 'trage_eintrag',
    table: trageEintrag,
    key: ['teilId', 'datum'],
    remoteConflict: 'benutzer_id,teil_id,datum',
    paged: true,
  },
  {
    name: 'waescheschwelle',
    table: waescheschwelle,
    key: ['kategorie'],
    remoteConflict: 'benutzer_id,kategorie',
    paged: false,
  },
  {
    name: 'groessenprofil',
    table: groessenprofil,
    key: ['bereich'],
    remoteConflict: 'benutzer_id,bereich',
    paged: false,
  },
  {
    name: 'stilprofil',
    table: stilprofil,
    key: ['stil'],
    remoteConflict: 'benutzer_id,stil',
    paged: false,
  },
  {
    name: 'einstellungen',
    table: einstellungen,
    key: ['schluessel'],
    remoteConflict: 'benutzer_id',
    paged: false,
    localOnly: { schluessel: 'standard' },
  },
];
