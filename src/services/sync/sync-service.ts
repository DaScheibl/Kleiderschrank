import { AppState } from 'react-native';

import { onLocalChange } from '@/data/changes';
import {
  databaseFileForAccount,
  isDatabaseReady,
  rememberDatabaseFileForAccount,
  switchDatabase,
} from '@/data/db/client';
import { runSync } from '@/data/sync/engine';
import {
  bindAccount,
  boundAccount,
  drizzleLocalStore,
  isWardrobeEmpty,
  takeOverForAccount,
} from '@/data/sync/local-store';
import { SYNC_TABLES } from '@/data/sync/tables';
import { kontoAbgleich } from '@/domain/konto/kontoabgleich';

import { ensureSession, supabase } from '../supabase';
import { supabaseRemoteStore } from './remote-store';

export type SyncStatus =
  | { art: 'nicht_eingerichtet' }
  | { art: 'offline' }
  | { art: 'laeuft' }
  | { art: 'bereit'; zuletzt: string }
  | { art: 'fehler'; meldung: string; zuletzt: string | null }
  | { art: 'anderes_konto'; lokal: string; sitzung: string };

export interface SyncState {
  status: SyncStatus;
  kontoId: string | null;
  istAnonym: boolean;
  email: string | null;
}

const ANFANG: SyncState = {
  status: supabase ? { art: 'offline' } : { art: 'nicht_eingerichtet' },
  kontoId: null,
  istAnonym: true,
  email: null,
};
let state: SyncState = ANFANG;
let zuletztErfolgreich: string | null = null;
const listeners = new Set<() => void>();

function setState(teil: Partial<SyncState>) {
  state = { ...state, ...teil };
  listeners.forEach((l) => l());
}

export function getSyncState(): SyncState {
  return state;
}

/** Nach Abmelden oder Kontolöschung: Anzeige zurücksetzen, bis die nächste Sitzung steht. */
export function resetSyncState(): void {
  zuletztErfolgreich = null;
  setState(ANFANG);
}

export function subscribeSync(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

let laufend: Promise<void> | null = null;
let nochmal = false;

/** Ein Lauf zur Zeit; Anfragen währenddessen führen zu genau einem weiteren Lauf. */
export function syncNow(): Promise<void> {
  if (laufend) {
    nochmal = true;
    return laufend;
  }
  laufend = (async () => {
    try {
      do {
        nochmal = false;
        await einLauf();
      } while (nochmal);
    } finally {
      laufend = null;
    }
  })();
  return laufend;
}

async function einLauf(): Promise<void> {
  if (!supabase) return setState({ status: { art: 'nicht_eingerichtet' } });
  if (!isDatabaseReady()) return;

  const user = await ensureSession();
  if (!user) return setState({ status: { art: 'offline' } });
  setState({ kontoId: user.id, istAnonym: user.is_anonymous ?? false, email: user.email ?? null });

  const abgleich = kontoAbgleich(boundAccount(), user.id);
  if (abgleich.art === 'anderes_konto' && isWardrobeEmpty()) {
    // Ein leerer Schrank braucht keine Rückfrage: direkt zum Schrank des Kontos wechseln.
    switchDatabase(databaseFileForAccount(user.id));
    return setState({ status: { art: 'laeuft' } });
  }
  if (abgleich.art === 'anderes_konto') {
    // Nichts anfassen, bis der Nutzer entschieden hat.
    return setState({
      status: { art: 'anderes_konto', lokal: abgleich.lokal, sitzung: abgleich.sitzung },
    });
  }
  if (abgleich.art === 'binden') {
    bindAccount(user.id);
    rememberDatabaseFileForAccount(user.id);
  }

  // Bis Block F (Abo) synchronisiert jedes Konto; das Plus-Gating folgt mit E11.
  setState({ status: { art: 'laeuft' } });
  const result = await runSync(
    SYNC_TABLES,
    drizzleLocalStore,
    supabaseRemoteStore(supabase, user.id),
    user.id,
  );
  if (result.fehler.length > 0) {
    const f = result.fehler[0]!;
    setState({
      status: {
        art: 'fehler',
        meldung: `${f.tabelle}: ${f.meldung}`,
        zuletzt: zuletztErfolgreich,
      },
    });
  } else {
    zuletztErfolgreich = new Date().toISOString();
    setState({ status: { art: 'bereit', zuletzt: zuletztErfolgreich } });
  }
}

/** Antwort auf die Frage beim Kontowechsel. Lokale Daten werden in keinem Fall gelöscht. */
export async function resolveAccountConflict(wahl: 'uebernehmen' | 'beiseitelegen'): Promise<void> {
  const s = state.status;
  if (s.art !== 'anderes_konto') return;
  if (wahl === 'uebernehmen') {
    takeOverForAccount(s.sitzung);
    rememberDatabaseFileForAccount(s.sitzung);
    await syncNow();
  } else {
    // Der bisherige Schrank bleibt in seiner Datei; das neue Konto bekommt seine eigene.
    switchDatabase(databaseFileForAccount(s.sitzung));
    setState({ status: { art: 'laeuft' } });
    // Der Sync startet, sobald die neue Datei migriert ist (siehe onDatabaseReady).
  }
}

const DEBOUNCE_MS = 4000;
const INTERVALL_MS = 2 * 60 * 1000;
let gestartet = false;

/** Startet die Auslöser: App im Vordergrund, lokale Änderungen, alle zwei Minuten. */
export function startSyncService(): void {
  if (gestartet || !supabase) return;
  gestartet = true;
  const client = supabase;

  let timer: ReturnType<typeof setTimeout> | null = null;
  onLocalChange(() => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => void syncNow(), DEBOUNCE_MS);
  });

  setInterval(() => {
    if (AppState.currentState === 'active') void syncNow();
  }, INTERVALL_MS);

  // Laut Supabase-Doku: Token nur im Vordergrund erneuern.
  AppState.addEventListener('change', (zustand) => {
    if (zustand === 'active') {
      client.auth.startAutoRefresh();
      void syncNow();
    } else {
      client.auth.stopAutoRefresh();
    }
  });
  client.auth.startAutoRefresh();
}

/** Wird aufgerufen, sobald eine (neue) Datenbankdatei migriert ist. */
export function onDatabaseReady(): void {
  startSyncService();
  void syncNow();
}
