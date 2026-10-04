// Integrationstest gegen die Edge Function "ki-sortierung" (npm run test:supabase).
// Ohne gesetzten Schlüssel muss sie "nicht eingerichtet" melden und darf nichts zählen.
// Mit Schlüssel prüft er eine echte Antwort – dabei entstehen Kosten von unter einem Cent.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { KiEingabe } from '@/domain/engine/ki';

let client: SupabaseClient;

const teil = (rolle: 'oberteil' | 'hose' | 'jacke', art: string, farbe: string) => ({
  rolle,
  art,
  farbe,
  muster: 'uni',
  waerme: 1,
  formal: 2,
  regentauglich: rolle === 'jacke',
  tags: [],
});

const eingabe: KiEingabe = {
  datum: '2026-10-05',
  bestandsPruefsumme: `test-${Date.now()}`,
  wetter: {
    gefuehltMin: 8,
    gefuehltMax: 13,
    regenrisiko: 0.7,
    regenAb: '14:00',
    windKmh: 22,
    lage: 'regen',
  },
  anlass: { formalitaet: 2, quelle: 'termin' },
  stile: ['business_casual'],
  kandidaten: [
    {
      id: 'k1',
      regelScore: 80,
      teile: [
        teil('oberteil', 'hemd', 'Weiß'),
        teil('hose', 'chino', 'Beige'),
        teil('jacke', 'regenjacke', 'Marine'),
      ],
    },
    {
      id: 'k2',
      regelScore: 75,
      teile: [teil('oberteil', 'pullover', 'Grau'), teil('hose', 'anzughose', 'Schwarz')],
    },
  ],
};

beforeAll(async () => {
  client = createClient(
    process.env.EXPO_PUBLIC_SUPABASE_URL!,
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { error } = await client.auth.signInAnonymously();
  if (error) throw error;
});

afterAll(async () => {
  await client.functions.invoke('konto-loeschen', { method: 'POST' });
});

describe('KI-Sortierung', () => {
  it('lehnt Eingaben mit zusätzlichen Feldern ab (z. B. Termintitel)', async () => {
    const { response } = await client.functions.invoke('ki-sortierung', {
      body: { ...eingabe, termin: 'Kundentermin bei Müller' },
    });
    expect(response?.status).toBe(400);
  });

  it('antwortet gültig – oder meldet ohne Schlüssel "nicht eingerichtet" ohne zu zählen', async () => {
    const { data, response } = await client.functions.invoke('ki-sortierung', { body: eingabe });
    if (response?.status === 503) {
      const { data: zaehler } = await client.from('ki_nutzung').select('anzahl');
      expect(zaehler).toEqual([]);
      return;
    }
    expect(response?.status).toBe(200);
    expect(data.reihenfolge.map((r: { id: string }) => r.id).sort()).toEqual(['k1', 'k2']);
    for (const r of data.reihenfolge) {
      expect(r.begruendung.length).toBeLessThanOrEqual(160);
      expect(r.titel.split(/\s+/).filter(Boolean).length).toBeLessThanOrEqual(4);
    }
    expect(data.tipp.length).toBeLessThanOrEqual(120);

    // Zweiter Aufruf kommt aus dem Zwischenspeicher und zählt nicht erneut.
    const zweiter = await client.functions.invoke('ki-sortierung', { body: eingabe });
    expect(zweiter.data.quelle).toBe('cache');
    const { data: zaehler } = await client.from('ki_nutzung').select('anzahl');
    expect(zaehler).toEqual([{ anzahl: 1 }]);
  });
});
