import { farbfamilie } from '../farbe/farbharmonie';
import type { Bewertung, Kleidungsstueck, LokalesDatum, Uuid } from '../modell/typen';

/** Ein bewertetes Outfit aus der Historie, auf das Nötigste reduziert. */
export interface OutfitHistorie {
  datum: LokalesDatum;
  kombinationsSchluessel: string;
  bewertung: Bewertung;
  getragen: boolean;
  teilIds: readonly Uuid[];
}

/** Gelernte Vorlieben, jeweils zwischen −1 (abgelehnt) und +1 (gefällt). */
export interface FeedbackGewichte {
  teile: ReadonlyMap<Uuid, number>;
  farbpaare: ReadonlyMap<string, number>;
  kombinationen: ReadonlyMap<string, number>;
}

export const LEERES_FEEDBACK: FeedbackGewichte = {
  teile: new Map(),
  farbpaare: new Map(),
  kombinationen: new Map(),
};

/** Ältere Bewertungen zählen weniger: nach 30 Tagen nur noch halb. */
const HALBWERTSZEIT_TAGE = 30;
/** Glättung: Ein einzelnes Wischen soll nicht sofort alles umwerfen. */
const GLAETTUNG = 1;

function tageZwischen(a: LokalesDatum, b: LokalesDatum): number {
  return Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86_400_000);
}

export function farbpaarSchluessel(a: Kleidungsstueck, b: Kleidungsstueck): string {
  return [farbfamilie(a.farbeHex, a.farbeName), farbfamilie(b.farbeHex, b.farbeName)]
    .sort()
    .join('|');
}

function signal(o: OutfitHistorie): number {
  if (o.getragen) return 1; // Getragen ist die stärkste Zustimmung.
  if (o.bewertung === 'gefaellt') return 1;
  if (o.bewertung === 'abgelehnt') return -1;
  return 0;
}

class Mittelwert {
  private summe = new Map<string, number>();
  private gewicht = new Map<string, number>();
  add(key: string, wert: number, g: number) {
    this.summe.set(key, (this.summe.get(key) ?? 0) + wert * g);
    this.gewicht.set(key, (this.gewicht.get(key) ?? 0) + g);
  }
  ergebnis(): Map<string, number> {
    const m = new Map<string, number>();
    for (const [k, s] of this.summe) m.set(k, s / (this.gewicht.get(k)! + GLAETTUNG));
    return m;
  }
}

/** Gleitende Mittelwerte aus allen Bewertungen – kein maschinelles Lernen. */
export function lerneAusFeedback(
  historie: readonly OutfitHistorie[],
  teileNachId: ReadonlyMap<Uuid, Kleidungsstueck>,
  heute: LokalesDatum,
): FeedbackGewichte {
  const teile = new Mittelwert();
  const farbpaare = new Mittelwert();
  const kombinationen = new Mittelwert();

  for (const o of historie) {
    const s = signal(o);
    if (s === 0) continue;
    const g = 0.5 ** (Math.max(0, tageZwischen(o.datum, heute)) / HALBWERTSZEIT_TAGE);
    kombinationen.add(o.kombinationsSchluessel, s, g);
    const vorhanden = o.teilIds
      .map((id) => teileNachId.get(id))
      .filter((t): t is Kleidungsstueck => !!t);
    for (const t of vorhanden) teile.add(t.id, s, g);
    for (let i = 0; i < vorhanden.length; i++) {
      for (let j = i + 1; j < vorhanden.length; j++) {
        farbpaare.add(farbpaarSchluessel(vorhanden[i]!, vorhanden[j]!), s, g);
      }
    }
  }
  return {
    teile: teile.ergebnis(),
    farbpaare: farbpaare.ergebnis(),
    kombinationen: kombinationen.ergebnis(),
  };
}

/**
 * Gelernter Wert einer Kombination zwischen −1 und +1: Mittel aus Teilen, Farbpaaren und –
 * falls schon einmal bewertet – der Kombination selbst.
 */
export function feedbackWert(
  f: FeedbackGewichte,
  teile: readonly Kleidungsstueck[],
  kombinationsSchluessel: string,
): number {
  const werte: number[] = [];
  const teilWerte = teile.map((t) => f.teile.get(t.id)).filter((w): w is number => w !== undefined);
  if (teilWerte.length) werte.push(teilWerte.reduce((a, b) => a + b, 0) / teilWerte.length);

  const paarWerte: number[] = [];
  for (let i = 0; i < teile.length; i++) {
    for (let j = i + 1; j < teile.length; j++) {
      const w = f.farbpaare.get(farbpaarSchluessel(teile[i]!, teile[j]!));
      if (w !== undefined) paarWerte.push(w);
    }
  }
  if (paarWerte.length) werte.push(paarWerte.reduce((a, b) => a + b, 0) / paarWerte.length);

  const kombi = f.kombinationen.get(kombinationsSchluessel);
  if (kombi !== undefined) werte.push(kombi);

  return werte.length ? werte.reduce((a, b) => a + b, 0) / werte.length : 0;
}
