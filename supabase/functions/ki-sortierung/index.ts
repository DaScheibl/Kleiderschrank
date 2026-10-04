// KI-Sortierung (B4). Entscheidungen: E4 = Claude Haiku 4.5, E5 = sortieren, begründen, ein Tagestipp.
// Das Modell baut keine Outfits: Es ordnet nur die Kandidaten der Regel-Engine und formuliert.
// Ablauf: Identität → Eingabe strikt prüfen → Cache → Schlüssel da? → Tageszähler → Modell →
// Antwort prüfen → Cache und Kostenprotokoll.

import Anthropic from 'npm:@anthropic-ai/sdk@0.131';
import { z } from 'npm:zod@4';

import { adminClient, json, nutzerAusAnfrage } from '../_shared/auth.ts';

const MODELL = 'claude-haiku-4-5';
// Preise je Token in Mikro-US-Dollar (1 $ bzw. 5 $ je Million Token).
const PREIS_EIN = 1;
const PREIS_AUS = 5;
const ZEITLIMIT_MS = 6000;
const MAX_BEGRUENDUNG = 160;
const MAX_TIPP = 120;

// Bewusst ohne Teilenamen, Termintitel, Orte oder Kontakte – nur abstrakte Merkmale.
const Teil = z
  .object({
    rolle: z.enum(['oberteil', 'hose', 'jacke', 'schuhe', 'schmuck']),
    art: z.string().max(40),
    farbe: z.string().max(40),
    muster: z.string().max(20),
    waerme: z.number().int().min(0).max(3),
    formal: z.number().int().min(0).max(3),
    regentauglich: z.boolean(),
    tags: z.array(z.string().max(30)).max(7),
  })
  .strict();

const Eingabe = z
  .object({
    datum: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    bestandsPruefsumme: z.string().min(4).max(64),
    wetter: z
      .object({
        gefuehltMin: z.number(),
        gefuehltMax: z.number(),
        regenrisiko: z.number().min(0).max(1),
        regenAb: z.string().max(5).nullable(),
        windKmh: z.number().min(0).max(300),
        lage: z.string().max(20),
      })
      .strict()
      .nullable(),
    anlass: z
      .object({ formalitaet: z.number().int().min(0).max(3), quelle: z.enum(['termin', 'alltag']) })
      .strict(),
    stile: z.array(z.string().max(30)).max(7),
    kandidaten: z
      .array(
        z
          .object({
            id: z.string().max(8),
            teile: z.array(Teil).min(2).max(7),
            regelScore: z.number(),
          })
          .strict(),
      )
      .min(1)
      .max(10),
  })
  .strict();
type Eingabe = z.infer<typeof Eingabe>;

const Antwort = z.object({
  reihenfolge: z.array(z.object({ id: z.string(), titel: z.string(), begruendung: z.string() })),
  tipp: z.string(),
});
type Antwort = z.infer<typeof Antwort>;

const SCHEMA = {
  type: 'object',
  properties: {
    reihenfolge: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          titel: { type: 'string' },
          begruendung: { type: 'string' },
        },
        required: ['id', 'titel', 'begruendung'],
        additionalProperties: false,
      },
    },
    tipp: { type: 'string' },
  },
  required: ['reihenfolge', 'tipp'],
  additionalProperties: false,
};

const SYSTEM = `Du bist der Stil-Assistent einer Kleiderschrank-App. Du bekommst das Wetter, den Anlass
des Tages und bis zu zehn Outfit-Kandidaten, die eine Regel-Engine bereits aus sauberen, passenden
Teilen gebaut hat. Du baust keine neuen Outfits und erfindest keine Teile.

Aufgaben:
1. Ordne ALLE Kandidaten vom besten zum schwächsten für heute (Wetter, Anlass, Stil, Farbwirkung).
   Nutze jede id genau einmal.
2. Schreibe je Kandidat einen Titel mit höchstens vier Wörtern und eine Begründung in genau einem
   deutschen Satz mit höchstens 160 Zeichen. Nenne den Grund konkret (z. B. Regen ab 14 Uhr,
   Business-Termin, gefühlte Temperatur) und beziehe dich nur auf Teile, die im Kandidaten vorkommen.
3. Schreibe einen kurzen Tagestipp (höchstens 120 Zeichen), der über die Kleidung hinaus hilft,
   z. B. Schirm mitnehmen oder abends einen Schal einpacken. Gibt es nichts Sinnvolles, gib "" zurück.

Sprich die Person mit "du" an. Keine Emojis.`;

function pruefen(antwort: Antwort, eingabe: Eingabe): Antwort {
  const erlaubt = new Set(eingabe.kandidaten.map((k) => k.id));
  const gesehen = new Set<string>();
  const reihenfolge = antwort.reihenfolge.filter((r) => {
    if (!erlaubt.has(r.id) || gesehen.has(r.id)) return false;
    gesehen.add(r.id);
    return true;
  });
  // Fehlende Kandidaten in Regel-Reihenfolge hinten anhängen – ohne Text, die App nimmt dann ihren.
  for (const k of eingabe.kandidaten) {
    if (!gesehen.has(k.id)) reihenfolge.push({ id: k.id, titel: '', begruendung: '' });
  }
  return {
    reihenfolge: reihenfolge.map((r) => ({
      id: r.id,
      titel: r.titel.trim().split(/\s+/).length <= 4 ? r.titel.trim() : '',
      begruendung: r.begruendung.trim().length <= MAX_BEGRUENDUNG ? r.begruendung.trim() : '',
    })),
    tipp: antwort.tipp.trim().length <= MAX_TIPP ? antwort.tipp.trim() : '',
  };
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ fehler: 'methode_nicht_erlaubt' }, 405);

  const admin = adminClient();
  const nutzer = await nutzerAusAnfrage(req, admin);
  if (!nutzer) return json({ fehler: 'nicht_angemeldet' }, 401);

  let roh: unknown;
  try {
    roh = await req.json();
  } catch {
    return json({ fehler: 'kein_json' }, 400);
  }
  const ergebnis = Eingabe.safeParse(roh);
  if (!ergebnis.success) return json({ fehler: 'eingabe_ungueltig' }, 400);
  const eingabe = ergebnis.data;

  // Ein Aufruf pro Nutzer, Tag und Bestand – danach aus dem Zwischenspeicher.
  const { data: cache } = await admin
    .from('ki_cache')
    .select('antwort')
    .eq('benutzer_id', nutzer.id)
    .eq('datum', eingabe.datum)
    .eq('bestands_pruefsumme', eingabe.bestandsPruefsumme)
    .maybeSingle();
  if (cache) return json({ ...cache.antwort, quelle: 'cache' });

  // Erst prüfen, dann zählen: ohne Schlüssel verbraucht niemand sein Kontingent.
  const schluessel = Deno.env.get('KI_API_SCHLUESSEL');
  if (!schluessel) return json({ status: 'nicht_eingerichtet' }, 503);

  const limit = Number(Deno.env.get('KI_TAGESLIMIT_SORTIERUNG') ?? '3');
  const { data: erlaubt, error: zaehlFehler } = await admin.rpc('ki_zaehler_erhoehen', {
    p_benutzer: nutzer.id,
    p_art: 'sortierung',
    p_limit: limit,
  });
  if (zaehlFehler) return json({ fehler: 'zaehler' }, 500);
  if (!erlaubt) return json({ status: 'tageslimit' }, 429);

  const start = Date.now();
  const client = new Anthropic({ apiKey: schluessel, maxRetries: 0, timeout: ZEITLIMIT_MS });
  let protokoll = { tokensEin: 0, tokensAus: 0, erfolg: false };
  try {
    const antwort = await client.messages.create({
      model: MODELL,
      max_tokens: 2000,
      system: SYSTEM,
      messages: [{ role: 'user', content: JSON.stringify(eingabe) }],
      output_config: { format: { type: 'json_schema', schema: SCHEMA } },
    });
    protokoll = {
      tokensEin: antwort.usage.input_tokens,
      tokensAus: antwort.usage.output_tokens,
      erfolg: false,
    };
    if (antwort.stop_reason !== 'end_turn') {
      return json({ fehler: 'modell_abbruch', grund: antwort.stop_reason }, 502);
    }
    const text = antwort.content.find((b) => b.type === 'text');
    const geparst = Antwort.safeParse(text ? JSON.parse(text.text) : null);
    if (!geparst.success) return json({ fehler: 'antwort_ungueltig' }, 502);

    const geprueft = pruefen(geparst.data, eingabe);
    protokoll.erfolg = true;
    await admin.from('ki_cache').upsert({
      benutzer_id: nutzer.id,
      datum: eingabe.datum,
      bestands_pruefsumme: eingabe.bestandsPruefsumme,
      antwort: geprueft,
    });
    return json({ ...geprueft, quelle: 'modell' });
  } catch (e) {
    const status = e instanceof Anthropic.APIError ? (e.status ?? 502) : 504;
    return json({ fehler: 'modell_nicht_erreichbar', status }, 502);
  } finally {
    await admin.from('ki_protokoll').insert({
      benutzer_id: nutzer.id,
      art: 'sortierung',
      modell: MODELL,
      tokens_ein: protokoll.tokensEin,
      tokens_aus: protokoll.tokensAus,
      kosten_mikro_usd: protokoll.tokensEin * PREIS_EIN + protokoll.tokensAus * PREIS_AUS,
      dauer_ms: Date.now() - start,
      erfolg: protokoll.erfolg,
    });
  }
});
