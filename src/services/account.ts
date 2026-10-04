import type { AuthError } from '@supabase/supabase-js';

import {
  activeDatabaseFile,
  deleteDatabaseFile,
  freshDatabaseFile,
  switchDatabase,
} from '@/data/db/client';

import { ensureSession, supabase } from './supabase';
import { getSyncState, resetSyncState, syncNow } from './sync/sync-service';

/**
 * Anmeldung ohne Passwort, mit Code per E-Mail.
 * - aufwerten: aus der anonymen Sitzung wird ein Konto – gleiche ID, kein Datenverlust.
 * - anmelden:  die E-Mail gehört schon zu einem Konto; danach greift der Kontoabgleich.
 */
export type EmailModus = 'aufwerten' | 'anmelden';
export type Ergebnis<T = void> = { ok: true; wert: T } | { ok: false; meldung: string };

function fehlertext(e: AuthError | Error | null | undefined): string {
  const code = e && 'code' in e ? e.code : undefined;
  switch (code) {
    case 'otp_expired':
      return 'Der Code ist abgelaufen oder falsch. Fordere einen neuen an.';
    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit':
      return 'Zu viele Versuche. Bitte warte eine Minute.';
    case 'email_address_invalid':
    case 'validation_failed':
      return 'Diese E-Mail-Adresse ist ungültig.';
    case 'otp_disabled':
    case 'signup_disabled':
      return 'Anmeldung per E-Mail ist im Projekt nicht freigeschaltet.';
    default:
      return 'Das hat nicht geklappt. Prüfe die Verbindung und versuch es noch einmal.';
  }
}

export async function requestEmailCode(email: string): Promise<Ergebnis<EmailModus>> {
  if (!supabase) return { ok: false, meldung: 'Kein Server eingerichtet.' };
  const adresse = email.trim().toLowerCase();
  const user = await ensureSession();
  if (!user) return { ok: false, meldung: 'Keine Verbindung zum Server.' };

  if (user.is_anonymous) {
    const { error } = await supabase.auth.updateUser({ email: adresse });
    if (!error) return { ok: true, wert: 'aufwerten' };
    if (error.code !== 'email_exists') return { ok: false, meldung: fehlertext(error) };
  }
  const { error } = await supabase.auth.signInWithOtp({
    email: adresse,
    options: { shouldCreateUser: false },
  });
  if (error) return { ok: false, meldung: fehlertext(error) };
  return { ok: true, wert: 'anmelden' };
}

export async function verifyEmailCode(
  email: string,
  code: string,
  modus: EmailModus,
): Promise<Ergebnis> {
  if (!supabase) return { ok: false, meldung: 'Kein Server eingerichtet.' };
  const { error } = await supabase.auth.verifyOtp({
    email: email.trim().toLowerCase(),
    token: code.trim(),
    type: modus === 'aufwerten' ? 'email_change' : 'email',
  });
  if (error) return { ok: false, meldung: fehlertext(error) };
  void syncNow();
  return { ok: true, wert: undefined };
}

/**
 * Abmelden löscht nie lokale Daten: Der Schrank bleibt in seiner Datei auf dem Gerät und
 * ist nach erneuter Anmeldung mit demselben Konto wieder da. Bis dahin startet ein leerer Schrank.
 */
export async function signOut(): Promise<void> {
  if (!supabase) return;
  await supabase.auth.signOut({ scope: 'local' });
  resetSyncState();
  switchDatabase(freshDatabaseFile());
}

/**
 * Kontolöschung (Apple-Pflicht). Löscht auf dem Server Konto, Zeilen und Bilder und danach –
 * vom Nutzer doppelt bestätigt – auch den Schrank dieses Kontos auf dem Gerät.
 */
export async function deleteAccount(): Promise<Ergebnis> {
  if (!supabase) return { ok: false, meldung: 'Kein Server eingerichtet.' };
  const kontoId = getSyncState().kontoId;
  if (!kontoId) return { ok: false, meldung: 'Keine Verbindung zum Server.' };

  const { error } = await supabase.functions.invoke('konto-loeschen', { method: 'POST' });
  if (error)
    return {
      ok: false,
      meldung: 'Löschen auf dem Server ist fehlgeschlagen. Es wurde nichts gelöscht.',
    };

  const alteDatei = activeDatabaseFile();
  await supabase.auth.signOut({ scope: 'local' });
  resetSyncState();
  switchDatabase(freshDatabaseFile());
  deleteDatabaseFile(alteDatei, kontoId);
  return { ok: true, wert: undefined };
}
