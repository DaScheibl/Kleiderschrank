// Kontolöschung (A3): löscht erst alle Bilder des Nutzers, dann das Konto.
// Alle Tabellen hängen per "on delete cascade" an auth.users und verschwinden mit.
// Die Oberfläche mit doppelter Bestätigung folgt in A3. Lokale Daten auf dem Gerät
// bleiben unberührt; ob sie gelöscht werden, entscheidet der Nutzer in der App.

import { adminClient, json, nutzerAusAnfrage } from '../_shared/auth.ts';

const BUCKET = 'kleidung';
const SEITE = 1000;

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ fehler: 'methode_nicht_erlaubt' }, 405);

  const admin = adminClient();
  const nutzer = await nutzerAusAnfrage(req, admin);
  if (!nutzer) return json({ fehler: 'nicht_angemeldet' }, 401);

  // Bilder zuerst: Storage-Objekte hängen nicht per Cascade am Konto.
  for (;;) {
    const { data: dateien, error } = await admin.storage
      .from(BUCKET)
      .list(nutzer.id, { limit: SEITE });
    if (error) return json({ fehler: 'bilder_auflisten', detail: error.message }, 500);
    if (!dateien || dateien.length === 0) break;

    const pfade = dateien.map((d) => `${nutzer.id}/${d.name}`);
    const { error: loeschFehler } = await admin.storage.from(BUCKET).remove(pfade);
    if (loeschFehler) return json({ fehler: 'bilder_loeschen', detail: loeschFehler.message }, 500);
    if (dateien.length < SEITE) break;
  }

  const { error } = await admin.auth.admin.deleteUser(nutzer.id);
  if (error) return json({ fehler: 'konto_loeschen', detail: error.message }, 500);

  return json({ geloescht: true });
});
