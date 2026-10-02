import { createClient, type SupabaseClient, type User } from 'npm:@supabase/supabase-js@2';

/** Client mit Service-Rolle. Umgeht RLS – existiert ausschließlich hier auf dem Server. */
export function adminClient(): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL');
  const secret = secretKey();
  if (!url || !secret) throw new Error('SUPABASE_URL oder Secret Key fehlt');
  return createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
}

function secretKey(): string | undefined {
  // Neue Projekte: JSON-Wörterbuch SUPABASE_SECRET_KEYS; ältere: SUPABASE_SERVICE_ROLE_KEY.
  const neu = Deno.env.get('SUPABASE_SECRET_KEYS');
  if (neu) {
    try {
      const keys = JSON.parse(neu) as Record<string, string>;
      return keys['default'] ?? Object.values(keys)[0];
    } catch {
      // fällt auf den alten Schlüssel zurück
    }
  }
  return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
}

/** Prüft das Benutzer-JWT aus dem Authorization-Header. Anonyme Sitzungen zählen als angemeldet. */
export async function nutzerAusAnfrage(req: Request, admin: SupabaseClient): Promise<User | null> {
  const header = req.headers.get('Authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : null;
  if (!token) return null;
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
