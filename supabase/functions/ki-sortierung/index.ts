// KI-Sortierung (B4) – Gerüst.
// Ablauf im fertigen Zustand: Identität prüfen → Eingabe validieren → Cache prüfen →
// Tageszähler serverseitig erhöhen → Modell aufrufen → Antwort validieren → Kosten protokollieren.
// Bis zur Entscheidung E4 ist kein Anbieter angebunden; die Funktion meldet dann
// "nicht_eingerichtet" und die App bleibt bei der Reihenfolge der Regel-Engine.

import { z } from 'npm:zod@4';

import { adminClient, json, nutzerAusAnfrage } from '../_shared/auth.ts';

const Teil = z.object({
  name: z.string().max(200),
  farbe: z.string().max(40),
  waerme: z.number().int().min(0).max(3),
  formal: z.number().int().min(0).max(3),
  tags: z.array(z.string().max(40)).max(10),
});

// Bewusst keine Felder für Termintitel, Orte oder Kontakte: was hier nicht steht, wird abgelehnt.
export const Eingabe = z
  .object({
    wetter: z.object({
      gefuehltMin: z.number(),
      gefuehltMax: z.number(),
      regenrisiko: z.number().min(0).max(1),
      wind: z.number().min(0),
      lage: z.string().max(40),
    }),
    anlass: z.object({
      formalitaet: z.number().int().min(0).max(3),
      quelle: z.enum(['termin', 'alltag', 'manuell']),
    }),
    stile: z.array(z.string().max(40)).max(7),
    bestandsPruefsumme: z.string().max(128),
    kandidaten: z
      .array(
        z.object({
          id: z.string().max(64),
          oberteil: Teil,
          hose: Teil,
          jacke: Teil.nullable(),
          schuhe: Teil.nullable(),
          schmuck: z.array(Teil).max(3),
          regelScore: z.number(),
        }),
      )
      .min(1)
      .max(10),
  })
  .strict();

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
  const eingabe = Eingabe.safeParse(roh);
  if (!eingabe.success) return json({ fehler: 'eingabe_ungueltig' }, 400);

  // Hier folgt in B4: Cache, ki_zaehler_erhoehen, Modellaufruf, Validierung, ki_protokoll.
  // Die Prüfung auf KI_API_SCHLUESSEL kommt dort vor das Zählen, damit ein fehlender
  // Anbieter keine Tageskontingente verbraucht.
  return json({ status: 'nicht_eingerichtet' }, 503);
});
