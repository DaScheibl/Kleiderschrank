import { and, eq, gte, inArray, lt } from 'drizzle-orm';
import { randomUUID } from 'expo-crypto';

import type { Kandidat } from '@/domain/engine/kandidaten';
import type { OutfitHistorie } from '@/domain/lernen/feedback';
import type {
  Bewertung,
  Formalitaet,
  LokalesDatum,
  Outfit,
  Rolle,
  Uuid,
} from '@/domain/modell/typen';

import { notifyLocalChange } from '../changes';
import { getDb } from '../db/client';
import { outfit, outfitTeil } from '../db/schema';
import { markWorn } from './wear-repository';

export function toOutfitDomain(row: typeof outfit.$inferSelect): Outfit {
  const { syncOffen: _syncOffen, ...o } = row;
  return o;
}

export function outfitsOfDayQuery(datum: LokalesDatum) {
  return getDb()
    .select()
    .from(outfit)
    .where(and(eq(outfit.datum, datum), eq(outfit.geloescht, false)));
}

/** Historie vor dem Tag – Grundlage für Lernen und Wiederholungssperre. */
export function historyQuery(abDatum: LokalesDatum, bisVorDatum: LokalesDatum) {
  return getDb()
    .select()
    .from(outfit)
    .where(
      and(gte(outfit.datum, abDatum), lt(outfit.datum, bisVorDatum), eq(outfit.geloescht, false)),
    );
}

export function outfitPartsQuery(outfitIds: readonly Uuid[]) {
  return getDb()
    .select()
    .from(outfitTeil)
    .where(and(inArray(outfitTeil.outfitId, [...outfitIds]), eq(outfitTeil.geloescht, false)));
}

export function toHistory(
  outfits: readonly (typeof outfit.$inferSelect)[],
  teile: readonly (typeof outfitTeil.$inferSelect)[],
): OutfitHistorie[] {
  const nachOutfit = new Map<string, Uuid[]>();
  for (const t of teile)
    nachOutfit.set(t.outfitId, [...(nachOutfit.get(t.outfitId) ?? []), t.teilId]);
  return outfits.map((o) => ({
    datum: o.datum,
    kombinationsSchluessel: o.kombinationsSchluessel,
    bewertung: o.bewertung,
    getragen: o.getragen,
    teilIds: nachOutfit.get(o.id) ?? [],
  }));
}

function rollen(k: Kandidat): { teilId: Uuid; rolle: Rolle }[] {
  return [
    { teilId: k.oberteil.id, rolle: 'oberteil' as const },
    { teilId: k.hose.id, rolle: 'hose' as const },
    ...(k.jacke ? [{ teilId: k.jacke.id, rolle: 'jacke' as const }] : []),
    ...(k.schuhe ? [{ teilId: k.schuhe.id, rolle: 'schuhe' as const }] : []),
    ...k.schmuck.map((s) => ({ teilId: s.id, rolle: 'schmuck' as const })),
  ];
}

/**
 * Speichert eine Swipe-Entscheidung (B3). Jede Karte wird zu einem Outfit mit Bewertung;
 * erneutes Wischen derselben Kombination am selben Tag überschreibt die Bewertung.
 */
export function rateCandidate(
  k: Kandidat,
  bewertung: Bewertung,
  datum: LokalesDatum,
  anlass: { formalitaet: Formalitaet; ausTermin: boolean },
): Uuid {
  const jetzt = new Date().toISOString();
  const id = getDb().transaction((tx) => {
    const vorhanden = tx
      .select()
      .from(outfit)
      .where(and(eq(outfit.datum, datum), eq(outfit.kombinationsSchluessel, k.schluessel)))
      .get();
    if (vorhanden) {
      tx.update(outfit)
        .set({ bewertung, geloescht: false, zuletztGeaendert: jetzt, syncOffen: true })
        .where(eq(outfit.id, vorhanden.id))
        .run();
      return vorhanden.id;
    }
    const neu = randomUUID();
    tx.insert(outfit)
      .values({
        id: neu,
        angelegtAm: jetzt,
        zuletztGeaendert: jetzt,
        datum,
        anlass: anlass.ausTermin ? 'termin' : 'alltag',
        anlassFormalitaet: anlass.formalitaet,
        bewertung,
        kombinationsSchluessel: k.schluessel,
        titel: k.titel,
        begruendung: k.begruendung,
        begruendungQuelle: k.begruendungQuelle ?? 'regel',
        regelScore: Math.round(k.score),
      })
      .run();
    for (const r of rollen(k)) {
      tx.insert(outfitTeil)
        .values({
          id: randomUUID(),
          angelegtAm: jetzt,
          zuletztGeaendert: jetzt,
          outfitId: neu,
          ...r,
        })
        .run();
    }
    return neu;
  });
  notifyLocalChange();
  return id;
}

/** Macht ein Outfit zur Tageswahl; eine frühere Wahl desselben Tages wird abgelöst. */
export function chooseDailyOutfit(outfitId: Uuid, datum: LokalesDatum): void {
  const jetzt = new Date().toISOString();
  getDb().transaction((tx) => {
    const frueher = tx
      .select()
      .from(outfit)
      .where(and(eq(outfit.datum, datum), eq(outfit.istTageswahl, true)))
      .all();
    for (const o of frueher) {
      if (o.getragen)
        throw new Error('Die heutige Wahl ist schon getragen und lässt sich nicht mehr ändern.');
      if (o.id === outfitId) continue;
      tx.update(outfit)
        .set({ istTageswahl: false, zuletztGeaendert: jetzt, syncOffen: true })
        .where(eq(outfit.id, o.id))
        .run();
    }
    tx.update(outfit)
      .set({ istTageswahl: true, zuletztGeaendert: jetzt, syncOffen: true })
      .where(eq(outfit.id, outfitId))
      .run();
  });
  notifyLocalChange();
}

/** "Trage ich heute": Outfit als getragen markieren und jedes Teil eintragen (Wäschelogik). */
export function wearDailyOutfit(outfitId: Uuid, datum: LokalesDatum): void {
  const jetzt = new Date().toISOString();
  const db = getDb();
  const teile = db.select().from(outfitTeil).where(eq(outfitTeil.outfitId, outfitId)).all();
  db.update(outfit)
    .set({ getragen: true, zuletztGeaendert: jetzt, syncOffen: true })
    .where(eq(outfit.id, outfitId))
    .run();
  for (const t of teile) markWorn(t.teilId, datum, outfitId);
  notifyLocalChange();
}
