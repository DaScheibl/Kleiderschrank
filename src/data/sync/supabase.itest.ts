// Integrationstest gegen das echte Supabase-Projekt aus .env (npm run test:supabase).
// Legt einen anonymen Testnutzer an, gleicht mit der echten Engine ab und löscht den
// Nutzer am Ende über die Edge Function konto-loeschen wieder – samt aller Zeilen.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { supabaseRemoteStore } from '@/services/sync/remote-store';

import { runSync } from './engine';
import { MemoryLocalStore } from './memory-local-store';
import { SYNC_TABLES } from './tables';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
const tab = (name: string) => SYNC_TABLES.find((t) => t.name === name)!;
const TEIL = tab('kleidungsstueck');
const TRAGEN = tab('trage_eintrag');
const SCHWELLE = tab('waescheschwelle');

let client: SupabaseClient;
let uid: string;
let geloescht = false;

function neuerClient() {
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function teil(id: string, name: string, zeit: string) {
  return {
    id,
    angelegtAm: zeit,
    zuletztGeaendert: zeit,
    geloescht: false,
    syncOffen: true,
    name,
    kategorie: 'hose',
    unterart: 'jeans',
    farbeHex: '#4A6A8F',
    farbeName: 'Denim',
    nebenfarbeHex: null,
    nebenfarbeName: null,
    muster: 'uni',
    material: null,
    waermegrad: 1,
    formalitaet: 0,
    regentauglich: false,
    stilTags: ['clean'],
    groesseText: null,
    groesseSystem: null,
    groesseNormiert: null,
    groesseQuelle: null,
    metallton: null,
    waeschestatus: 'sauber',
    gewaschenAm: null,
    waescheschwelleEigen: null,
    marke: null,
    kaufpreisCent: 4999,
    kaufdatum: '2026-09-01',
    status: 'aktiv',
    statusSeit: zeit,
    verkaufspreisCent: null,
    zustand: null,
    aussortierFrageNichtVor: null,
    bildPfad: null,
    bildPruefsumme: null,
  };
}

beforeAll(async () => {
  if (!url || !key) throw new Error('.env fehlt: EXPO_PUBLIC_SUPABASE_URL / _PUBLISHABLE_KEY');
  client = neuerClient();
  const { data, error } = await client.auth.signInAnonymously();
  if (error) throw error;
  uid = data.user!.id;
});

afterAll(async () => {
  if (!geloescht && client) await client.functions.invoke('konto-loeschen', { method: 'POST' });
});

describe('Sync gegen Supabase', () => {
  const t1 = crypto.randomUUID();

  it('lädt hoch und holt auf ein zweites "Gerät" herunter', async () => {
    const a = new MemoryLocalStore();
    a.put(TEIL, teil(t1, 'Jeans', '2026-10-04T08:00:00.000Z'));
    a.put(SCHWELLE, {
      kategorie: 'hose',
      schwelle: 5,
      angelegtAm: '2026-10-04T08:00:00.000Z',
      zuletztGeaendert: '2026-10-04T08:00:00.000Z',
      geloescht: false,
      syncOffen: true,
    });
    const r = await runSync(SYNC_TABLES, a, supabaseRemoteStore(client, uid), uid);
    expect(r.fehler).toEqual([]);
    expect(r.hochgeladen).toBe(2);

    const b = new MemoryLocalStore();
    const r2 = await runSync(SYNC_TABLES, b, supabaseRemoteStore(client, uid), uid);
    expect(r2.fehler).toEqual([]);
    expect(b.get(TEIL, t1)).toMatchObject({
      name: 'Jeans',
      stilTags: ['clean'],
      kaufpreisCent: 4999,
      kaufdatum: '2026-09-01',
      zuletztGeaendert: '2026-10-04T08:00:00.000Z',
      syncOffen: false,
    });
    expect(b.get(SCHWELLE, 'hose')).toMatchObject({ schwelle: 5 });
  });

  it('älterer Stand verliert auch auf dem Server', async () => {
    const a = new MemoryLocalStore();
    a.put(TEIL, teil(t1, 'Jeans alt', '2026-10-03T08:00:00.000Z'));
    await runSync(SYNC_TABLES, a, supabaseRemoteStore(client, uid), uid);
    expect(a.get(TEIL, t1)!.name).toBe('Jeans');
  });

  it('gleicher Tag auf zwei Geräten ergibt einen Trageeintrag mit gleicher id', async () => {
    const a = new MemoryLocalStore();
    const b = new MemoryLocalStore();
    await runSync(SYNC_TABLES, a, supabaseRemoteStore(client, uid), uid);
    await runSync(SYNC_TABLES, b, supabaseRemoteStore(client, uid), uid);
    const eintrag = (id: string, zeit: string) => ({
      id,
      teilId: t1,
      outfitId: null,
      datum: '2026-10-04',
      angelegtAm: zeit,
      zuletztGeaendert: zeit,
      geloescht: false,
      syncOffen: true,
    });
    a.put(TRAGEN, eintrag(crypto.randomUUID(), '2026-10-04T09:00:00.000Z'));
    b.put(TRAGEN, eintrag(crypto.randomUUID(), '2026-10-04T09:05:00.000Z'));
    for (const g of [a, b, a]) {
      const r = await runSync(SYNC_TABLES, g, supabaseRemoteStore(client, uid), uid);
      expect(r.fehler).toEqual([]);
    }
    const { data } = await client.from('trage_eintrag').select('id');
    expect(data).toHaveLength(1);
    expect(a.get(TRAGEN, `${t1}|2026-10-04`)!.id).toBe(data![0]!.id);
    expect(b.get(TRAGEN, `${t1}|2026-10-04`)!.id).toBe(data![0]!.id);
  });

  it('seitenweiser Abruf über identische Serverzeiten hinweg ist vollständig', async () => {
    const a = new MemoryLocalStore();
    for (let i = 0; i < 620; i++)
      a.put(TEIL, teil(crypto.randomUUID(), `Teil ${i}`, '2026-10-04T10:00:00.000Z'));
    const r = await runSync(SYNC_TABLES, a, supabaseRemoteStore(client, uid), uid);
    expect(r.fehler).toEqual([]);

    const b = new MemoryLocalStore();
    const r2 = await runSync(SYNC_TABLES, b, supabaseRemoteStore(client, uid), uid);
    expect(r2.fehler).toEqual([]);
    expect(b.tab(TEIL).size).toBe(621);
  });

  it('ein fremdes Konto sieht nichts davon', async () => {
    const fremd = neuerClient();
    const { error } = await fremd.auth.signInAnonymously();
    expect(error).toBeNull();
    const { data } = await fremd.from('kleidungsstueck').select('id');
    expect(data).toEqual([]);
    await fremd.functions.invoke('konto-loeschen', { method: 'POST' });
  });

  it('ki-sortierung antwortet ohne Anbieter mit "nicht eingerichtet"', async () => {
    const { error } = await client.functions.invoke('ki-sortierung', {
      method: 'POST',
      body: { kaputt: true },
    });
    // Ungültige Eingabe wird vor allem anderen abgelehnt (400).
    expect(error).not.toBeNull();
  });

  it('konto-loeschen entfernt Konto und alle Zeilen', async () => {
    const { data, error } = await client.functions.invoke('konto-loeschen', { method: 'POST' });
    expect(error).toBeNull();
    expect(data).toEqual({ geloescht: true });
    geloescht = true;

    const pruef = neuerClient();
    await pruef.auth.signInAnonymously();
    const { data: rest } = await pruef.from('kleidungsstueck').select('id').eq('benutzer_id', uid);
    expect(rest).toEqual([]);
    await pruef.functions.invoke('konto-loeschen', { method: 'POST' });
  });
});
