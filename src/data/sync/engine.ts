import { fromRemote, keyOf, toRemote, type LocalRow, type RemoteRow } from './mapper';
import type { SyncTable } from './tables';

/** Abrufstand: letzte gesehene Serverzeit, bei seitenweisem Abruf zusätzlich die id. */
export interface Cursor {
  zeit: string;
  id: string | null;
}

export interface LocalStore {
  pending(t: SyncTable): LocalRow[];
  /** Setzt sync_offen zurück – nur, wenn die Zeile seit dem Hochladen nicht erneut geändert wurde. */
  markSynced(t: SyncTable, rows: readonly LocalRow[]): void;
  findByKeys(t: SyncTable, rows: readonly LocalRow[]): Map<string, LocalRow>;
  /** Schreibt Zeilen vom Server (Upsert über den fachlichen Schlüssel). Löscht nie. */
  write(t: SyncTable, rows: readonly LocalRow[]): void;
  getCursor(t: SyncTable): Cursor | null;
  setCursor(t: SyncTable, cursor: Cursor): void;
}

export interface RemoteStore {
  upsert(t: SyncTable, rows: readonly RemoteRow[]): Promise<void>;
  /** Liefert geänderte Zeilen sortiert nach server_geaendert (und id). */
  fetchChanges(t: SyncTable, cursor: Cursor | null, limit: number | null): Promise<RemoteRow[]>;
}

export interface SyncResult {
  hochgeladen: number;
  heruntergeladen: number;
  fehler: { tabelle: string; richtung: 'hoch' | 'runter'; meldung: string }[];
}

const PUSH_BATCH = 200;
const PULL_SEITE = 500;

/** Jüngerer Stand gewinnt. Bei Gleichstand gilt der Server, das ist dann ohnehin derselbe Stand. */
export function remoteGewinnt(lokal: LocalRow | undefined, remote: LocalRow): boolean {
  if (!lokal) return true;
  const l = Date.parse(String(lokal.zuletztGeaendert));
  const r = Date.parse(String(remote.zuletztGeaendert));
  return r >= l;
}

export async function runSync(
  tables: readonly SyncTable[],
  local: LocalStore,
  remote: RemoteStore,
  benutzerId: string,
): Promise<SyncResult> {
  const result: SyncResult = { hochgeladen: 0, heruntergeladen: 0, fehler: [] };

  for (const t of tables) {
    const offen = local.pending(t);
    for (let i = 0; i < offen.length; i += PUSH_BATCH) {
      const batch = offen.slice(i, i + PUSH_BATCH);
      try {
        await remote.upsert(
          t,
          batch.map((r) => toRemote(t, r, benutzerId)),
        );
        local.markSynced(t, batch);
        result.hochgeladen += batch.length;
      } catch (e) {
        // Lokale Zeilen bleiben als offen markiert und gehen beim nächsten Lauf erneut hoch.
        result.fehler.push({ tabelle: t.name, richtung: 'hoch', meldung: meldung(e) });
        break;
      }
    }
  }

  for (const t of tables) {
    try {
      let cursor = local.getCursor(t);
      for (;;) {
        const seite = await remote.fetchChanges(t, cursor, t.paged ? PULL_SEITE : null);
        if (seite.length === 0) break;

        const eingehend = seite.map((r) => fromRemote(t, r));
        const vorhanden = local.findByKeys(t, eingehend);
        const uebernehmen = eingehend.filter((r) => remoteGewinnt(vorhanden.get(keyOf(t, r)), r));
        local.write(t, uebernehmen);
        result.heruntergeladen += uebernehmen.length;

        const letzte = seite[seite.length - 1]!;
        cursor = {
          zeit: String(letzte.server_geaendert),
          id: t.paged ? String(letzte.id) : null,
        };
        local.setCursor(t, cursor);
        if (!t.paged || seite.length < PULL_SEITE) break;
      }
    } catch (e) {
      result.fehler.push({ tabelle: t.name, richtung: 'runter', meldung: meldung(e) });
    }
  }

  return result;
}

function meldung(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (e && typeof e === 'object' && 'message' in e) return String(e.message);
  return String(e);
}
