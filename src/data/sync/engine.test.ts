import { getTableColumns } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { runSync, type Cursor, type RemoteStore } from './engine';
import { fromRemote, toRemote, type LocalRow, type RemoteRow } from './mapper';
import { MemoryLocalStore as FakeLocal } from './memory-local-store';
import { SYNC_TABLES, type SyncTable } from './tables';

const UID = 'benutzer-1';
const tabelle = (name: string) => SYNC_TABLES.find((t) => t.name === name)!;
const TEIL = tabelle('kleidungsstueck');
const TRAGEN = tabelle('trage_eintrag');
const SCHWELLE = tabelle('waescheschwelle');
const EINSTELLUNGEN = tabelle('einstellungen');

// ---------- Fakes ----------

/** Server wie in Supabase: ON CONFLICT je Tabelle, Konfliktregel per Trigger, server_geaendert = now() je Anweisung. */
class FakeRemote implements RemoteStore {
  rows = new Map<string, RemoteRow[]>();
  uhr = 0;
  failUpsert = false;

  tab(t: SyncTable) {
    if (!this.rows.has(t.name)) this.rows.set(t.name, []);
    return this.rows.get(t.name)!;
  }
  async upsert(t: SyncTable, rows: readonly RemoteRow[]) {
    if (this.failUpsert) throw new Error('Netzwerkfehler');
    this.uhr++;
    const jetzt = `2026-10-04T10:00:00.${String(this.uhr).padStart(6, '0')}+00:00`;
    const konflikt = t.remoteConflict.split(',');
    for (const neu of rows) {
      const alt = this.tab(t).find((a) => konflikt.every((k) => a[k] === neu[k]));
      if (!alt) {
        this.tab(t).push({ ...neu, server_geaendert: jetzt });
      } else if (
        Date.parse(String(neu.zuletzt_geaendert)) >= Date.parse(String(alt.zuletzt_geaendert))
      ) {
        Object.assign(alt, neu, { server_geaendert: jetzt, angelegt_am: alt.angelegt_am });
      }
    }
  }
  async fetchChanges(t: SyncTable, c: Cursor | null, limit: number | null) {
    const sortiert = [...this.tab(t)].sort((a, b) =>
      a.server_geaendert === b.server_geaendert
        ? String(a.id).localeCompare(String(b.id))
        : String(a.server_geaendert).localeCompare(String(b.server_geaendert)),
    );
    const neu = sortiert.filter((r) => {
      if (!c) return true;
      const z = String(r.server_geaendert);
      if (z > c.zeit) return true;
      return t.paged && z === c.zeit && String(r.id) > String(c.id);
    });
    return (limit ? neu.slice(0, limit) : neu).map((r) => ({ ...r }));
  }
}

// ---------- Testdaten ----------

function teil(id: string, name: string, zeit: string, extra: LocalRow = {}): LocalRow {
  return {
    id,
    angelegtAm: '2026-10-01T08:00:00.000Z',
    zuletztGeaendert: zeit,
    geloescht: false,
    syncOffen: true,
    name,
    kategorie: 'oberteil',
    unterart: null,
    farbeHex: '#FFFFFF',
    farbeName: 'Weiß',
    nebenfarbeHex: null,
    nebenfarbeName: null,
    muster: 'uni',
    material: null,
    waermegrad: 1,
    formalitaet: 0,
    regentauglich: false,
    stilTags: [],
    groesseText: null,
    groesseSystem: null,
    groesseNormiert: null,
    groesseQuelle: null,
    metallton: null,
    waeschestatus: 'sauber',
    gewaschenAm: null,
    waescheschwelleEigen: null,
    marke: null,
    kaufpreisCent: null,
    kaufdatum: null,
    status: 'aktiv',
    statusSeit: null,
    verkaufspreisCent: null,
    zustand: null,
    aussortierFrageNichtVor: null,
    bildPfad: null,
    bildPruefsumme: null,
    ...extra,
  };
}

function tragen(id: string, teilId: string, datum: string, zeit: string): LocalRow {
  return {
    id,
    teilId,
    datum,
    outfitId: null,
    angelegtAm: zeit,
    zuletztGeaendert: zeit,
    geloescht: false,
    syncOffen: true,
  };
}

// ---------- Tests ----------

describe('mapper', () => {
  it('überträgt alle Spalten, ergänzt benutzer_id und lässt sync_offen weg', () => {
    const remote = toRemote(TEIL, teil('t1', 'Hemd', '2026-10-04T08:00:00.000Z'), UID);
    const spalten = Object.values(getTableColumns(TEIL.table))
      .map((c) => c.name)
      .filter((n) => n !== 'sync_offen');
    expect(Object.keys(remote).sort()).toEqual([...spalten, 'benutzer_id'].sort());
    expect(remote.farbe_hex).toBe('#FFFFFF');
    expect(remote).not.toHaveProperty('sync_offen');
  });

  it('wandelt Zeitstempel und Uhrzeit vom Server in das lokale Format', () => {
    const lokal = fromRemote(EINSTELLUNGEN, {
      benutzer_id: UID,
      server_geaendert: '2026-10-04T10:00:00.123456+00:00',
      angelegt_am: '2026-10-04T10:00:00.5+00:00',
      zuletzt_geaendert: '2026-10-04T12:00:00+02:00',
      abendvorschau_uhrzeit: '20:00:00',
      alltags_formalitaet: 1,
      aussortier_nach_monaten: 9,
      ort_manuell: null,
      rundtour_abgeschlossen: true,
      geloescht: false,
    });
    expect(lokal).toMatchObject({
      schluessel: 'standard',
      syncOffen: false,
      angelegtAm: '2026-10-04T10:00:00.500Z',
      zuletztGeaendert: '2026-10-04T10:00:00.000Z',
      abendvorschauUhrzeit: '20:00',
      rundtourAbgeschlossen: true,
    });
    expect(lokal).not.toHaveProperty('benutzerId');
    expect(toRemote(EINSTELLUNGEN, lokal, UID)).not.toHaveProperty('schluessel');
  });
});

describe('runSync', () => {
  it('lädt Offenes hoch, bestätigt es und bringt es auf ein zweites Gerät', async () => {
    const server = new FakeRemote();
    const a = new FakeLocal();
    a.put(TEIL, teil('t1', 'Hemd', '2026-10-04T08:00:00.000Z'));

    const r = await runSync(SYNC_TABLES, a, server, UID);
    expect(r.fehler).toEqual([]);
    expect(r.hochgeladen).toBe(1);
    expect(a.get(TEIL, 't1')!.syncOffen).toBe(false);

    const b = new FakeLocal();
    await runSync(SYNC_TABLES, b, server, UID);
    expect(b.get(TEIL, 't1')).toMatchObject({ name: 'Hemd', syncOffen: false });
  });

  it('bei Konflikten gewinnt der jüngere Stand – auf beiden Geräten', async () => {
    const server = new FakeRemote();
    const a = new FakeLocal();
    const b = new FakeLocal();
    a.put(TEIL, teil('t1', 'Hemd', '2026-10-04T08:00:00.000Z'));
    await runSync(SYNC_TABLES, a, server, UID);
    await runSync(SYNC_TABLES, b, server, UID);

    b.put(TEIL, teil('t1', 'Hemd (B, neuer)', '2026-10-04T09:30:00.000Z'));
    await runSync(SYNC_TABLES, b, server, UID);
    a.put(TEIL, teil('t1', 'Hemd (A, älter)', '2026-10-04T09:00:00.000Z'));
    await runSync(SYNC_TABLES, a, server, UID);

    expect(a.get(TEIL, 't1')!.name).toBe('Hemd (B, neuer)');
    await runSync(SYNC_TABLES, b, server, UID);
    expect(b.get(TEIL, 't1')!.name).toBe('Hemd (B, neuer)');
  });

  it('ein Teil, am selben Tag auf zwei Geräten getragen, zählt einmal', async () => {
    const server = new FakeRemote();
    const a = new FakeLocal();
    const b = new FakeLocal();
    for (const g of [a, b]) g.put(TEIL, teil('t1', 'Hemd', '2026-10-04T08:00:00.000Z'));
    a.put(TRAGEN, tragen('ea', 't1', '2026-10-04', '2026-10-04T08:10:00.000Z'));
    b.put(TRAGEN, tragen('eb', 't1', '2026-10-04', '2026-10-04T08:20:00.000Z'));

    await runSync(SYNC_TABLES, a, server, UID);
    await runSync(SYNC_TABLES, b, server, UID);
    await runSync(SYNC_TABLES, a, server, UID);

    expect(server.tab(TRAGEN)).toHaveLength(1);
    expect(a.tab(TRAGEN).size).toBe(1);
    expect(b.tab(TRAGEN).size).toBe(1);
    expect(a.get(TRAGEN, 't1|2026-10-04')!.id).toBe(b.get(TRAGEN, 't1|2026-10-04')!.id);
  });

  it('eine Änderung während des Hochladens bleibt offen und geht beim nächsten Lauf hoch', async () => {
    const server = new FakeRemote();
    const a = new FakeLocal();
    a.put(TEIL, teil('t1', 'Hemd', '2026-10-04T08:00:00.000Z'));
    a.vorMarkSynced = () => {
      a.put(TEIL, teil('t1', 'Hemd geändert', '2026-10-04T08:00:05.000Z'));
      a.vorMarkSynced = undefined;
    };
    await runSync(SYNC_TABLES, a, server, UID);
    expect(a.get(TEIL, 't1')).toMatchObject({ name: 'Hemd geändert', syncOffen: true });

    await runSync(SYNC_TABLES, a, server, UID);
    expect(server.tab(TEIL)[0]!.name).toBe('Hemd geändert');
    expect(a.get(TEIL, 't1')!.syncOffen).toBe(false);
  });

  it('holt auch mehr als eine Seite mit identischer Serverzeit vollständig ab', async () => {
    const server = new FakeRemote();
    const a = new FakeLocal();
    for (let i = 0; i < 1234; i++) {
      a.put(TEIL, teil(`t${String(i).padStart(4, '0')}`, `Teil ${i}`, '2026-10-04T08:00:00.000Z'));
    }
    await runSync(SYNC_TABLES, a, server, UID);
    const b = new FakeLocal();
    const r = await runSync(SYNC_TABLES, b, server, UID);
    expect(r.heruntergeladen).toBe(1234);
    expect(b.tab(TEIL).size).toBe(1234);
  });

  it('ein Serverfehler löscht nichts und lässt alles für den nächsten Lauf offen', async () => {
    const server = new FakeRemote();
    server.failUpsert = true;
    const a = new FakeLocal();
    a.put(TEIL, teil('t1', 'Hemd', '2026-10-04T08:00:00.000Z'));
    a.put(SCHWELLE, {
      kategorie: 'hose',
      schwelle: 6,
      angelegtAm: '2026-10-04T08:00:00.000Z',
      zuletztGeaendert: '2026-10-04T08:00:00.000Z',
      geloescht: false,
      syncOffen: true,
    });

    const r = await runSync(SYNC_TABLES, a, server, UID);
    expect(r.fehler.length).toBeGreaterThan(0);
    expect(a.get(TEIL, 't1')).toMatchObject({ name: 'Hemd', syncOffen: true });
    expect(a.get(SCHWELLE, 'hose')).toMatchObject({ schwelle: 6, syncOffen: true });

    server.failUpsert = false;
    const r2 = await runSync(SYNC_TABLES, a, server, UID);
    expect(r2.fehler).toEqual([]);
    expect(a.get(TEIL, 't1')!.syncOffen).toBe(false);
  });

  it('Löschungen kommen als sanftes Löschen an, die Zeile bleibt lokal erhalten', async () => {
    const server = new FakeRemote();
    const a = new FakeLocal();
    const b = new FakeLocal();
    a.put(TEIL, teil('t1', 'Hemd', '2026-10-04T08:00:00.000Z'));
    await runSync(SYNC_TABLES, a, server, UID);
    await runSync(SYNC_TABLES, b, server, UID);

    a.put(TEIL, teil('t1', 'Hemd', '2026-10-04T09:00:00.000Z', { geloescht: true }));
    await runSync(SYNC_TABLES, a, server, UID);
    await runSync(SYNC_TABLES, b, server, UID);
    expect(b.get(TEIL, 't1')).toMatchObject({ name: 'Hemd', geloescht: true });
  });

  it('ein zweiter Lauf ohne Änderungen überträgt nichts', async () => {
    const server = new FakeRemote();
    const a = new FakeLocal();
    a.put(TEIL, teil('t1', 'Hemd', '2026-10-04T08:00:00.000Z'));
    await runSync(SYNC_TABLES, a, server, UID);
    const r = await runSync(SYNC_TABLES, a, server, UID);
    expect(r).toEqual({ hochgeladen: 0, heruntergeladen: 0, fehler: [] });
  });
});
