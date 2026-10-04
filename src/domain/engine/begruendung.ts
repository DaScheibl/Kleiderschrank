import type { Formalitaet, Kleidungsstueck, Waermegrad } from '../modell/typen';
import type { Wetterlage } from '../wetter/wetter';

// Textbausteine: Begründung und Titel ohne Sprachmodell (Auftrag B1).
// Kein Termintitel, kein Ort – nur abstrakte Werte.

export interface BegruendungsKontext {
  formalitaet: Formalitaet;
  anlassAusTermin: boolean;
  zielWaerme: Waermegrad;
  regen: boolean;
  regenAb: string | null;
  gefuehltMin: number | null;
  gefuehltMax: number | null;
  lage: Wetterlage | null;
}

export interface BegruendungsOutfit {
  oberteil: Kleidungsstueck;
  hose: Kleidungsstueck;
  jacke: Kleidungsstueck | null;
  schuhe: Kleidungsstueck | null;
  /** Teil, das am längsten nicht getragen wurde, mit Tagen */
  wiederentdeckt: { teil: Kleidungsstueck; tage: number } | null;
}

export const MAX_BEGRUENDUNG = 160;

const ANLASS_TEXT: Record<Formalitaet, string> = {
  0: 'ein entspannter Tag',
  1: 'ein Termin',
  2: 'ein Business-Termin',
  3: 'ein festlicher Anlass',
};

function kontextSaetze(k: BegruendungsKontext): string[] {
  const teile: string[] = [];
  if (k.regen)
    teile.push(k.regenAb ? `Regen ab ${k.regenAb.replace(':00', '')} Uhr` : 'Regen erwartet');
  if (k.anlassAusTermin && k.formalitaet >= 1) teile.push(ANLASS_TEXT[k.formalitaet]);
  if (k.gefuehltMin !== null && k.gefuehltMax !== null && teile.length < 2) {
    const min = Math.round(k.gefuehltMin);
    const max = Math.round(k.gefuehltMax);
    teile.push(min === max ? `gefühlt ${min} Grad` : `gefühlt ${min} bis ${max} Grad`);
  }
  return teile.slice(0, 2);
}

function gruende(o: BegruendungsOutfit, k: BegruendungsKontext): string[] {
  const g: string[] = [];
  if (k.formalitaet >= 2) g.push(o.oberteil.name);
  if (k.regen && o.jacke?.regentauglich) g.push(`die regentaugliche ${o.jacke.name}`);
  else if (k.regen && o.schuhe?.regentauglich) g.push(`regenfeste ${o.schuhe.name}`);
  else if (k.zielWaerme >= 2 && o.jacke) g.push(`die ${o.jacke.name}`);
  if (g.length < 2 && o.wiederentdeckt && o.wiederentdeckt.tage >= 14) {
    g.push(`${o.wiederentdeckt.teil.name}, seit ${o.wiederentdeckt.tage} Tagen nicht getragen`);
  }
  if (g.length === 0) g.push(`${o.oberteil.name} zu ${o.hose.name}`);
  return [...new Set(g)].slice(0, 2);
}

function kuerzen(text: string): string {
  if (text.length <= MAX_BEGRUENDUNG) return text;
  return `${text.slice(0, MAX_BEGRUENDUNG - 1).trimEnd()}…`;
}

export function begruendung(o: BegruendungsOutfit, k: BegruendungsKontext): string {
  const kontext = kontextSaetze(k);
  const warum = gruende(o, k).join(' und ');
  if (kontext.length === 0) return kuerzen(`Passt farblich zusammen: ${warum}.`);
  const satz = kontext.join(' und ');
  return kuerzen(`${satz.charAt(0).toUpperCase()}${satz.slice(1)}, darum ${warum}.`);
}

const ANLASS_TITEL: Record<Formalitaet, string> = {
  0: 'Entspannt unterwegs',
  1: 'Smart Casual',
  2: 'Business-Look',
  3: 'Festlich angezogen',
};
const KURZ: Record<Formalitaet, string> = { 0: 'Lässig', 1: 'Smart', 2: 'Business', 3: 'Festlich' };

/** Höchstens vier Wörter. */
export function titel(k: BegruendungsKontext): string {
  if (k.regen) return `${KURZ[k.formalitaet]} bei Regen`;
  if (k.zielWaerme === 0 && k.formalitaet <= 1) return 'Leicht und luftig';
  if (k.zielWaerme === 3 && k.formalitaet <= 1) return 'Warm eingepackt';
  return ANLASS_TITEL[k.formalitaet];
}
