import { and, eq, getTableColumns, like, or, type SQL } from 'drizzle-orm';
import type { SQLiteColumn } from 'drizzle-orm/sqlite-core';

import { getDb } from '../db/client';
import { syncMeta } from '../db/schema';
import type { Cursor, LocalStore } from './engine';
import { keyOf, type LocalRow } from './mapper';
import { SYNC_TABLES, type SyncTable } from './tables';

const KONTO = 'konto_id';
const cursorKey = (t: SyncTable) => `cursor:${t.name}`;

function col(t: SyncTable, prop: string): SQLiteColumn {
  const c = (getTableColumns(t.table) as Record<string, SQLiteColumn>)[prop];
  if (!c) throw new Error(`Spalte ${prop} fehlt in ${t.name}`);
  return c;
}

function keyWhere(t: SyncTable, row: LocalRow): SQL {
  return and(...t.key.map((k) => eq(col(t, k), row[k])))!;
}

// Drizzle kennt die konkrete Tabelle hier nur generisch; die Spalten kommen aus dem Schema.
const anyTable = (t: SyncTable) => t.table as any;

export const drizzleLocalStore: LocalStore = {
  pending(t) {
    return getDb()
      .select()
      .from(anyTable(t))
      .where(eq(col(t, 'syncOffen'), true))
      .all() as LocalRow[];
  },

  markSynced(t, rows) {
    getDb().transaction((tx) => {
      for (const row of rows) {
        tx.update(anyTable(t))
          .set({ syncOffen: false })
          .where(and(keyWhere(t, row), eq(col(t, 'zuletztGeaendert'), row.zuletztGeaendert)))
          .run();
      }
    });
  },

  findByKeys(t, rows) {
    const result = new Map<string, LocalRow>();
    if (rows.length === 0) return result;
    const db = getDb();
    // In Blöcken, damit die SQL-Anweisung klein bleibt.
    for (let i = 0; i < rows.length; i += 100) {
      const block = rows.slice(i, i + 100);
      const found = db
        .select()
        .from(anyTable(t))
        .where(or(...block.map((r) => keyWhere(t, r))))
        .all() as LocalRow[];
      for (const r of found) result.set(keyOf(t, r), r);
    }
    return result;
  },

  write(t, rows) {
    if (rows.length === 0) return;
    const target = t.key.map((k) => col(t, k));
    getDb().transaction((tx) => {
      for (const row of rows) {
        tx.insert(anyTable(t)).values(row).onConflictDoUpdate({ target, set: row }).run();
      }
    });
  },

  getCursor(t) {
    const row = getDb()
      .select()
      .from(syncMeta)
      .where(eq(syncMeta.schluessel, cursorKey(t)))
      .get();
    return row?.wert ? (JSON.parse(row.wert) as Cursor) : null;
  },

  setCursor(t, cursor) {
    setMeta(cursorKey(t), JSON.stringify(cursor));
  },
};

function setMeta(schluessel: string, wert: string | null): void {
  getDb()
    .insert(syncMeta)
    .values({ schluessel, wert })
    .onConflictDoUpdate({ target: syncMeta.schluessel, set: { wert } })
    .run();
}

export function boundAccount(): string | null {
  return getDb().select().from(syncMeta).where(eq(syncMeta.schluessel, KONTO)).get()?.wert ?? null;
}

export function bindAccount(kontoId: string): void {
  setMeta(KONTO, kontoId);
}

/**
 * "Schrank übernehmen": Der vorhandene Schrank gehört ab jetzt dem neuen Konto.
 * Alles wird als offen markiert und neu hochgeladen; Abrufstände beginnen von vorn.
 */
export function takeOverForAccount(kontoId: string): void {
  const db = getDb();
  db.transaction((tx) => {
    for (const t of SYNC_TABLES) {
      tx.update(t.table as never)
        .set({ syncOffen: true } as never)
        .run();
    }
    tx.delete(syncMeta).where(like(syncMeta.schluessel, 'cursor:%')).run();
  });
  bindAccount(kontoId);
}

export function pendingCount(): number {
  let n = 0;
  for (const t of SYNC_TABLES) n += drizzleLocalStore.pending(t).length;
  return n;
}
