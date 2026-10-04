import type { Cursor, LocalStore } from './engine';
import { keyOf, type LocalRow } from './mapper';
import type { SyncTable } from './tables';

/** LocalStore im Speicher – für Tests der Sync-Engine ohne Gerät. */
export class MemoryLocalStore implements LocalStore {
  rows = new Map<string, Map<string, LocalRow>>();
  cursors = new Map<string, Cursor>();
  /** Wird zwischen Hochladen und Bestätigen aufgerufen – simuliert eine Änderung in der Zwischenzeit. */
  vorMarkSynced?: () => void;

  tab(t: SyncTable) {
    if (!this.rows.has(t.name)) this.rows.set(t.name, new Map());
    return this.rows.get(t.name)!;
  }
  put(t: SyncTable, row: LocalRow) {
    this.tab(t).set(keyOf(t, row), { ...row });
  }
  get(t: SyncTable, key: string) {
    return this.tab(t).get(key);
  }
  pending(t: SyncTable) {
    return [...this.tab(t).values()].filter((r) => r.syncOffen).map((r) => ({ ...r }));
  }
  markSynced(t: SyncTable, rows: readonly LocalRow[]) {
    this.vorMarkSynced?.();
    for (const r of rows) {
      const aktuell = this.tab(t).get(keyOf(t, r));
      if (aktuell && aktuell.zuletztGeaendert === r.zuletztGeaendert) aktuell.syncOffen = false;
    }
  }
  findByKeys(t: SyncTable, rows: readonly LocalRow[]) {
    const m = new Map<string, LocalRow>();
    for (const r of rows) {
      const v = this.tab(t).get(keyOf(t, r));
      if (v) m.set(keyOf(t, r), v);
    }
    return m;
  }
  write(t: SyncTable, rows: readonly LocalRow[]) {
    for (const r of rows) this.tab(t).set(keyOf(t, r), { ...this.tab(t).get(keyOf(t, r)), ...r });
  }
  getCursor(t: SyncTable) {
    return this.cursors.get(t.name) ?? null;
  }
  setCursor(t: SyncTable, c: Cursor) {
    this.cursors.set(t.name, c);
  }
}
