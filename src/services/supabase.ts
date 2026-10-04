import { createClient, processLock, type SupabaseClient, type User } from '@supabase/supabase-js';

import { secureSessionStorage } from './secure-session-storage';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/** null, solange .env nicht ausgefüllt ist – die App läuft dann rein lokal. */
export const supabase: SupabaseClient | null =
  url && publishableKey
    ? createClient(url, publishableKey, {
        auth: {
          storage: secureSessionStorage,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
          lock: processLock,
        },
      })
    : null;

/**
 * Liefert den angemeldeten Nutzer. Gibt es noch keine Sitzung, wird still eine anonyme
 * angelegt (Entscheidung E1). Ohne Netz: null – die App arbeitet dann lokal weiter.
 */
export async function ensureSession(): Promise<User | null> {
  if (!supabase) return null;
  try {
    const { data } = await supabase.auth.getSession();
    if (data.session) return data.session.user;
    const { data: anon, error } = await supabase.auth.signInAnonymously();
    if (error) return null;
    return anon.user;
  } catch {
    return null;
  }
}
