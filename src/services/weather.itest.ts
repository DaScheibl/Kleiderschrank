// Integrationstest gegen die Edge Function "wetter" (npm run test:supabase).
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { tageswetter, zielWaermegrad, type WetterStunde } from '@/domain/wetter/wetter';

let client: SupabaseClient;

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

describe('Wetter-Proxy', () => {
  it('liefert stündliche Vorhersage mit gefühlter Temperatur, zweiter Abruf aus dem Zwischenspeicher', async () => {
    const body = { art: 'vorhersage', breite: 48.137154, laenge: 11.576124 };
    const erster = await client.functions.invoke('wetter', { body });
    expect(erster.error).toBeNull();
    const stunden = erster.data.stunden as WetterStunde[];
    expect(stunden.length).toBeGreaterThan(24);
    expect(stunden[0]).toHaveProperty('gefuehlt');
    expect(erster.data.lizenz).toBe('CC BY 4.0');

    const start = Date.now();
    const zweiter = await client.functions.invoke('wetter', { body });
    expect(zweiter.data.stunden).toEqual(stunden);
    expect(Date.now() - start).toBeLessThan(5000);

    const tag = tageswetter(stunden, new Date());
    expect(tag).not.toBeNull();
    expect(tag!.gefuehltMin).toBeLessThanOrEqual(tag!.gefuehltMax);
    expect([0, 1, 2, 3]).toContain(zielWaermegrad(tag!));
  });

  it('findet einen Ort von Hand und rundet auf ~1 km', async () => {
    const { data, error } = await client.functions.invoke('wetter', {
      body: { art: 'ort', name: 'Augsburg' },
    });
    expect(error).toBeNull();
    expect(data.breite).toBeCloseTo(48.37, 0);
    expect(String(data.breite).split('.')[1]?.length ?? 0).toBeLessThanOrEqual(2);
  });

  it('lehnt ungültige Eingaben ab', async () => {
    const { error } = await client.functions.invoke('wetter', {
      body: { art: 'vorhersage', breite: 200, laenge: 0 },
    });
    expect(error).not.toBeNull();
  });
});
