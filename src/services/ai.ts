import Storage from 'expo-sqlite/kv-store';

import type { KiAntwort, KiEingabe } from '@/domain/engine/ki';

import { ensureSession, supabase } from './supabase';

/** Länger wartet die App nicht; bis dahin – und danach bei Fehlern – gelten die Regeltexte. */
const ZEITLIMIT_MS = 9000;
const CACHE_PREFIX = 'ki:';

export type KiErgebnis =
  | { art: 'antwort'; antwort: KiAntwort }
  | { art: 'keine'; grund: 'nicht_eingerichtet' | 'tageslimit' | 'offline' | 'fehler' };

function ausCache(key: string): KiAntwort | null {
  try {
    const roh = Storage.getItemSync(key);
    return roh ? (JSON.parse(roh) as KiAntwort) : null;
  } catch {
    return null;
  }
}

/**
 * Fragt die KI-Sortierung an (B4). Gleiche Eingabe am selben Tag wird aus dem lokalen
 * Zwischenspeicher bedient – auch nach einem Neustart und ohne Netz.
 */
export async function requestAiRanking(eingabe: KiEingabe): Promise<KiErgebnis> {
  const key = `${CACHE_PREFIX}${eingabe.datum}:${eingabe.bestandsPruefsumme}`;
  const gespeichert = ausCache(key);
  if (gespeichert) return { art: 'antwort', antwort: gespeichert };

  if (!supabase || !(await ensureSession())) return { art: 'keine', grund: 'offline' };

  const { data, error, response } = await supabase.functions.invoke('ki-sortierung', {
    body: eingabe,
    timeout: ZEITLIMIT_MS,
  });
  if (error || !data?.reihenfolge) {
    const status = response?.status;
    if (status === 503) return { art: 'keine', grund: 'nicht_eingerichtet' };
    if (status === 429) return { art: 'keine', grund: 'tageslimit' };
    return { art: 'keine', grund: 'fehler' };
  }

  const antwort: KiAntwort = { reihenfolge: data.reihenfolge, tipp: data.tipp ?? '' };
  try {
    // Alte Tage aufräumen, damit sich nichts ansammelt.
    for (const k of Storage.getAllKeysSync()) {
      if (k.startsWith(CACHE_PREFIX) && !k.startsWith(`${CACHE_PREFIX}${eingabe.datum}`)) {
        Storage.removeItemSync(k);
      }
    }
    Storage.setItemSync(key, JSON.stringify(antwort));
  } catch {
    // Ohne lokalen Zwischenspeicher hilft immer noch der auf dem Server.
  }
  return { art: 'antwort', antwort };
}
