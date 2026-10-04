import type { SupabaseClient } from '@supabase/supabase-js';

import type { Cursor, RemoteStore } from '@/data/sync/engine';
import type { RemoteRow } from '@/data/sync/mapper';

// Werte in PostgREST-Filtern mit Sonderzeichen (":", "+", ".") müssen in Anführungszeichen.
const q = (wert: string) => `"${wert.replace(/"/g, '\\"')}"`;

export function supabaseRemoteStore(client: SupabaseClient, benutzerId: string): RemoteStore {
  return {
    async upsert(t, rows) {
      const { error } = await client
        .from(t.name)
        .upsert(rows as RemoteRow[], { onConflict: t.remoteConflict });
      if (error) throw error;
    },

    async fetchChanges(t, cursor: Cursor | null, limit) {
      let query = client
        .from(t.name)
        .select('*')
        .eq('benutzer_id', benutzerId)
        .order('server_geaendert');
      if (t.paged) query = query.order('id');

      if (cursor) {
        query =
          t.paged && cursor.id
            ? query.or(
                `server_geaendert.gt.${q(cursor.zeit)},and(server_geaendert.eq.${q(cursor.zeit)},id.gt.${cursor.id})`,
              )
            : query.gt('server_geaendert', cursor.zeit);
      }
      if (limit) query = query.limit(limit);

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as RemoteRow[];
    },
  };
}
