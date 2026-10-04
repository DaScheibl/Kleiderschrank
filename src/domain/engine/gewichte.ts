// Alle Gewichte der Bewertung an einer Stelle (Auftrag B1).
export const GEWICHTE = {
  farbharmonie: 40,
  langeNichtGetragen: 25,
  stilprofil: 20,
  formalitaetExakt: 15,
  waermeExakt: 10,
  gleicheKombination14Tage: -30,
  teilLetzte3Tage: -15,
  kurzVorWaescheschwelle: -10,
  feedback: 20,
} as const;

export type Kriterium = keyof typeof GEWICHTE;

/** Ab so vielen Tagen ohne Tragen gibt es den vollen Bonus. */
export const VOLLER_BONUS_NACH_TAGEN = 30;
/** Regen gilt ab diesem Risiko als erwartet. */
export const REGEN_AB = 0.5;
/** So oft darf ein einzelnes Teil höchstens im Stapel vorkommen. */
export const MAX_GLEICHES_TEIL = 3;
/** Vorauswahl je Kategorie, damit die Zahl der Kombinationen klein bleibt. */
export const VORAUSWAHL = { oberteil: 12, hose: 10, jacke: 5, schuhe: 5 } as const;
export const STANDARD_ANZAHL = 10;
