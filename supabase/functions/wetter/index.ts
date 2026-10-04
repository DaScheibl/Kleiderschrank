// Wetter-Proxy (A4, Entscheidung E2: MET Norway).
// - Koordinaten werden hier nochmals auf ~1 km gerundet; MET sieht nur unseren Server.
// - Zwischenspeicher je Ort, Gültigkeit aus dem Expires-Header, Neuabruf mit If-Modified-Since.
// - Ortssuche für "Ort von Hand" über Photon (OpenStreetMap-Daten, gelegentliche Einzelabfragen).
// Gesendet wird ausschließlich der Ort bzw. Ortsname – nie Nutzerdaten.

import { z } from 'npm:zod@4';

import { adminClient, json, nutzerAusAnfrage } from '../_shared/auth.ts';

const USER_AGENT = 'Kleidungsschrank/1.0 (+https://github.com/DaScheibl/Kleiderschrank)';
const MET_URL = 'https://api.met.no/weatherapi/locationforecast/2.0/complete';
// Nominatim sperrt Anfragen aus der Supabase-Cloud (403); Photon nutzt dieselben OSM-Daten.
const PHOTON_URL = 'https://photon.komoot.io/api/';
const STUNDEN = 48;

const Eingabe = z.discriminatedUnion('art', [
  z.object({
    art: z.literal('vorhersage'),
    breite: z.number().min(-90).max(90),
    laenge: z.number().min(-180).max(180),
  }),
  z.object({ art: z.literal('ort'), name: z.string().trim().min(2).max(100) }),
]);

const runde = (x: number) => Math.round(x * 100) / 100;

interface MetZeitpunkt {
  time: string;
  data: {
    instant: { details: Record<string, number | undefined> };
    next_1_hours?: {
      summary: { symbol_code: string };
      details: Record<string, number | undefined>;
    };
  };
}

function verdichten(met: {
  properties: { meta: { updated_at: string }; timeseries: MetZeitpunkt[] };
}) {
  const grenze = Date.now() + STUNDEN * 3600_000;
  return {
    quelle: 'MET Norway',
    lizenz: 'CC BY 4.0',
    aktualisiert: met.properties.meta.updated_at,
    stunden: met.properties.timeseries
      .filter((t) => t.data.next_1_hours && Date.parse(t.time) <= grenze)
      .map((t) => {
        const i = t.data.instant.details;
        const n = t.data.next_1_hours!;
        return {
          zeit: t.time,
          temperatur: i.air_temperature ?? null,
          gefuehlt: i.apparent_air_temperature ?? null,
          windMs: i.wind_speed ?? null,
          feuchte: i.relative_humidity ?? null,
          niederschlagMm: n.details.precipitation_amount ?? null,
          wahrscheinlichkeit: n.details.probability_of_precipitation ?? null,
          symbol: n.summary.symbol_code,
        };
      }),
  };
}

function gueltigBis(res: Response): string {
  const expires = Date.parse(res.headers.get('Expires') ?? '');
  // Fehlt Expires, höchstens 30 Minuten zwischenspeichern.
  return new Date(Number.isFinite(expires) ? expires : Date.now() + 30 * 60_000).toISOString();
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ fehler: 'methode_nicht_erlaubt' }, 405);
  const admin = adminClient();
  if (!(await nutzerAusAnfrage(req, admin))) return json({ fehler: 'nicht_angemeldet' }, 401);

  let roh: unknown;
  try {
    roh = await req.json();
  } catch {
    return json({ fehler: 'kein_json' }, 400);
  }
  const eingabe = Eingabe.safeParse(roh);
  if (!eingabe.success) return json({ fehler: 'eingabe_ungueltig' }, 400);

  if (eingabe.data.art === 'ort') {
    const url = `${PHOTON_URL}?limit=1&lang=de&q=${encodeURIComponent(eingabe.data.name)}`;
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
    if (!res.ok) return json({ fehler: 'ortssuche_fehlgeschlagen', status: res.status }, 502);
    const antwort = (await res.json()) as {
      features: { geometry: { coordinates: [number, number] }; properties: { name?: string } }[];
    };
    const t = antwort.features[0];
    if (!t) return json({ fehler: 'ort_nicht_gefunden' }, 404);
    const [lon, lat] = t.geometry.coordinates;
    return json({
      name: t.properties.name || eingabe.data.name,
      breite: runde(lat),
      laenge: runde(lon),
      lizenz: '© OpenStreetMap-Mitwirkende (ODbL), Suche: Photon by komoot',
    });
  }

  const breite = runde(eingabe.data.breite);
  const laenge = runde(eingabe.data.laenge);
  const schluessel = `${breite.toFixed(2)},${laenge.toFixed(2)}`;

  const { data: cache } = await admin
    .from('wetter_cache')
    .select('daten, gueltig_bis, last_modified')
    .eq('schluessel', schluessel)
    .maybeSingle();

  if (cache && Date.parse(cache.gueltig_bis) > Date.now()) {
    return json({ ...cache.daten, veraltet: false });
  }

  const headers: Record<string, string> = { 'User-Agent': USER_AGENT };
  if (cache?.last_modified) headers['If-Modified-Since'] = cache.last_modified;

  let res: Response;
  try {
    res = await fetch(`${MET_URL}?lat=${breite}&lon=${laenge}`, { headers });
  } catch {
    return cache
      ? json({ ...cache.daten, veraltet: true })
      : json({ fehler: 'wetter_nicht_erreichbar' }, 502);
  }

  if (res.status === 304 && cache) {
    await admin
      .from('wetter_cache')
      .update({ gueltig_bis: gueltigBis(res), abgerufen: new Date().toISOString() })
      .eq('schluessel', schluessel);
    return json({ ...cache.daten, veraltet: false });
  }
  if (!res.ok) {
    return cache
      ? json({ ...cache.daten, veraltet: true })
      : json({ fehler: 'wetter_nicht_erreichbar' }, 502);
  }

  const daten = verdichten(await res.json());
  await admin.from('wetter_cache').upsert({
    schluessel,
    daten,
    gueltig_bis: gueltigBis(res),
    last_modified: res.headers.get('Last-Modified'),
    abgerufen: new Date().toISOString(),
  });
  // Alte Einträge nebenbei aufräumen, damit die Tabelle klein bleibt.
  await admin
    .from('wetter_cache')
    .delete()
    .lt('abgerufen', new Date(Date.now() - 2 * 86_400_000).toISOString());

  return json({ ...daten, veraltet: false });
});
