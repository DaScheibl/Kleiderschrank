import { getTableColumns } from 'drizzle-orm';

import type { SyncTable } from './tables';

export type LocalRow = Record<string, unknown>;
export type RemoteRow = Record<string, unknown>;

// Postgres liefert "2026-10-04T08:00:00.123456+00:00"; lokal gilt einheitlich ISO mit "Z",
// damit Vergleiche und Anzeige überall gleich funktionieren.
const ZEITSTEMPEL = new Set(['angelegt_am', 'zuletzt_geaendert', 'gewaschen_am', 'status_seit']);
const UHRZEIT = new Set(['abendvorschau_uhrzeit']);
const NUR_SERVER = new Set(['benutzer_id', 'server_geaendert']);

function columns(t: SyncTable): [prop: string, column: string][] {
  return Object.entries(getTableColumns(t.table)).map(([prop, col]) => [prop, col.name]);
}

export function toRemote(t: SyncTable, row: LocalRow, benutzerId: string): RemoteRow {
  const out: RemoteRow = { benutzer_id: benutzerId };
  for (const [prop, column] of columns(t)) {
    if (prop === 'syncOffen' || (t.localOnly && prop in t.localOnly)) continue;
    out[column] = row[prop] ?? null;
  }
  return out;
}

export function fromRemote(t: SyncTable, remote: RemoteRow): LocalRow {
  const out: LocalRow = { ...t.localOnly, syncOffen: false };
  for (const [prop, column] of columns(t)) {
    if (prop === 'syncOffen' || NUR_SERVER.has(column) || !(column in remote)) continue;
    const wert = remote[column];
    if (typeof wert === 'string' && ZEITSTEMPEL.has(column))
      out[prop] = new Date(wert).toISOString();
    else if (typeof wert === 'string' && UHRZEIT.has(column)) out[prop] = wert.slice(0, 5);
    else out[prop] = wert;
  }
  return out;
}

export function keyOf(t: SyncTable, row: LocalRow): string {
  return t.key.map((k) => String(row[k])).join('|');
}
