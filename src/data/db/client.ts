import { drizzle } from 'drizzle-orm/expo-sqlite';
import { deleteDatabaseSync, openDatabaseSync, type SQLiteDatabase } from 'expo-sqlite';
import Storage from 'expo-sqlite/kv-store';

import * as schema from './schema';

/**
 * Je Konto eine eigene Datei. "Schrank beiseitelegen" beim Kontowechsel heißt nur:
 * eine andere Datei aktivieren. Keine Datei wird je gelöscht oder umbenannt.
 */
const STANDARD_DATEI = 'schrank.db';
const ZEIGER = 'aktiver_schrank';

function createDrizzle(sqlite: SQLiteDatabase) {
  return drizzle(sqlite, { schema });
}
export type Database = ReturnType<typeof createDrizzle>;

let aktiv: { datei: string; sqlite: SQLiteDatabase; db: Database } | null = null;
const listeners = new Set<() => void>();

function oeffnen(datei: string) {
  // enableChangeListener versorgt useLiveQuery mit Änderungen.
  const sqlite = openDatabaseSync(datei, { enableChangeListener: true });
  sqlite.execSync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  return { datei, sqlite, db: createDrizzle(sqlite) };
}

export function activeDatabaseFile(): string {
  return aktiv?.datei ?? Storage.getItemSync(ZEIGER) ?? STANDARD_DATEI;
}

export function getDb(): Database {
  if (!aktiv) aktiv = oeffnen(activeDatabaseFile());
  return aktiv.db;
}

/** Datei, in der der Schrank dieses Kontos auf dem Gerät liegt – auch wenn sie "schrank.db" heißt. */
export function databaseFileForAccount(kontoId: string): string {
  return Storage.getItemSync(`datei:${kontoId}`) ?? `schrank-${kontoId}.db`;
}

export function rememberDatabaseFileForAccount(kontoId: string): void {
  Storage.setItemSync(`datei:${kontoId}`, activeDatabaseFile());
}

// Erst nach erfolgreicher Migration darf der Sync die Datei anfassen.
let bereit: string | null = null;
export function setDatabaseReady(datei: string): void {
  bereit = datei;
}
export function isDatabaseReady(): boolean {
  return bereit !== null && bereit === activeDatabaseFile();
}

/** Aktiviert eine andere Schrank-Datei. Die bisherige bleibt unverändert auf dem Gerät. */
export function switchDatabase(datei: string): void {
  if (aktiv?.datei === datei) return;
  aktiv?.sqlite.closeSync();
  Storage.setItemSync(ZEIGER, datei);
  aktiv = oeffnen(datei);
  listeners.forEach((l) => l());
}

/** Name für einen neuen, leeren Schrank (nach Abmelden oder Kontolöschung). */
export function freshDatabaseFile(): string {
  return `schrank-${Date.now()}.db`;
}

/**
 * Löscht eine Schrank-Datei endgültig. Nur für die ausdrücklich bestätigte Kontolöschung;
 * Abmelden, Abbestellen und Fehler rufen das nie auf.
 */
export function deleteDatabaseFile(datei: string, kontoId: string): void {
  if (aktiv?.datei === datei) throw new Error('Die aktive Datei kann nicht gelöscht werden');
  deleteDatabaseSync(datei);
  Storage.removeItemSync(`datei:${kontoId}`);
}

export function subscribeDatabase(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
