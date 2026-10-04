import Storage from 'expo-sqlite/kv-store';

import { readSettings, updateSettings } from '@/data/repositories/settings-repository';
import type { WetterStunde } from '@/domain/wetter/wetter';

import { approximateDeviceLocation, runden, type Ort } from './location';
import { ensureSession, supabase } from './supabase';

/** Höchstens alle zwei Stunden neu laden (A4). */
const NEU_NACH_MS = 2 * 3600_000;
const CACHE_KEY = 'wetter_letzter_stand';

export interface Vorhersage {
  ort: Ort;
  stunden: WetterStunde[];
  /** Zeitpunkt des Abrufs bei uns */
  abgerufen: string;
  /** true: Netz oder Dienst nicht erreichbar, angezeigt wird der letzte Stand */
  veraltet: boolean;
}

export type WetterErgebnis =
  | { art: 'braucht_ort' }
  | { art: 'bereit'; vorhersage: Vorhersage }
  | { art: 'fehler'; meldung: string };

const schluessel = (o: Ort) => `${o.breite.toFixed(2)},${o.laenge.toFixed(2)}`;

function ausCache(): Vorhersage | null {
  try {
    const roh = Storage.getItemSync(CACHE_KEY);
    return roh ? (JSON.parse(roh) as Vorhersage) : null;
  } catch {
    return null;
  }
}

async function aktuellerOrt(): Promise<Ort | null> {
  const manuell = readSettings().ortManuell;
  if (manuell) return { name: manuell.name, breite: manuell.breite, laenge: manuell.laenge };
  try {
    return await approximateDeviceLocation();
  } catch {
    return null;
  }
}

export async function loadWeather(erzwingen = false): Promise<WetterErgebnis> {
  const ort = await aktuellerOrt();
  if (!ort) return { art: 'braucht_ort' };

  const cache = ausCache();
  const passend = cache && schluessel(cache.ort) === schluessel(ort) ? cache : null;
  if (
    passend &&
    !erzwingen &&
    !passend.veraltet &&
    Date.now() - Date.parse(passend.abgerufen) < NEU_NACH_MS
  ) {
    return { art: 'bereit', vorhersage: { ...passend, ort } };
  }

  const ohneNetz = (): WetterErgebnis =>
    passend
      ? { art: 'bereit', vorhersage: { ...passend, ort, veraltet: true } }
      : { art: 'fehler', meldung: 'Wetter gerade nicht erreichbar.' };

  if (!supabase || !(await ensureSession())) return ohneNetz();
  const { data, error } = await supabase.functions.invoke('wetter', {
    body: { art: 'vorhersage', breite: ort.breite, laenge: ort.laenge },
  });
  if (error || !data?.stunden) return ohneNetz();

  const vorhersage: Vorhersage = {
    ort,
    stunden: data.stunden as WetterStunde[],
    abgerufen: new Date().toISOString(),
    veraltet: Boolean(data.veraltet),
  };
  try {
    Storage.setItemSync(CACHE_KEY, JSON.stringify(vorhersage));
  } catch {
    // Ohne Zwischenspeicher geht es trotzdem weiter.
  }
  return { art: 'bereit', vorhersage };
}

/** Ort von Hand: Suche über den eigenen Proxy (OpenStreetMap), Ergebnis in den Einstellungen. */
export async function searchAndSavePlace(
  name: string,
): Promise<{ ok: true; ort: Ort } | { ok: false; meldung: string }> {
  if (!supabase || !(await ensureSession())) {
    return { ok: false, meldung: 'Für die Ortssuche braucht es eine Internetverbindung.' };
  }
  const { data, error } = await supabase.functions.invoke('wetter', {
    body: { art: 'ort', name },
  });
  if (error || !data?.breite) return { ok: false, meldung: 'Diesen Ort habe ich nicht gefunden.' };
  const ort = runden({ name: data.name as string, breite: data.breite, laenge: data.laenge });
  updateSettings({ ortManuell: ort });
  return { ok: true, ort };
}

export function clearManualPlace(): void {
  updateSettings({ ortManuell: null });
}
