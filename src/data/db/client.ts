import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';

import * as schema from './schema';

/** Eine Datei je Schrank. Beim Kontowechsel (A2) wird sie umbenannt, nie gelöscht. */
export const DATABASE_NAME = 'schrank.db';

// enableChangeListener versorgt useLiveQuery mit Änderungen.
const sqlite = openDatabaseSync(DATABASE_NAME, { enableChangeListener: true });
sqlite.execSync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

export const db = drizzle(sqlite, { schema });
export type Database = typeof db;
