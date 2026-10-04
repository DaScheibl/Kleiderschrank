import { passtNichtLautGroesse } from '../groesse/groessenvergleich';
import type {
  Formalitaet,
  Groessenprofil,
  Kategorie,
  Kleidungsstueck,
  Waermegrad,
} from '../modell/typen';
import { istVerfuegbar } from '../waesche/waescheregel';

export type Ausschluss =
  | 'nicht_verfuegbar' // im Korb, in der Maschine, aussortiert, verkauft, weggegeben, gelöscht
  | 'groesse'
  | 'waerme'
  | 'formalitaet'
  | 'nicht_regentauglich';

export interface FilterKontext {
  zielWaerme: Waermegrad;
  formalitaet: Formalitaet;
  regen: boolean;
  groessenprofil: readonly Groessenprofil[];
}

/** Kategorien, für die Wärme und Formalität gelten. Schmuck und Accessoires sind davon frei. */
const KLEIDUNG: readonly Kategorie[] = ['oberteil', 'hose', 'jacke', 'schuhe'];

/** Grund, warum ein Teil heute nie vorgeschlagen werden darf – oder null. */
export function ausschlussgrund(teil: Kleidungsstueck, k: FilterKontext): Ausschluss | null {
  if (!istVerfuegbar(teil)) return 'nicht_verfuegbar';
  if (passtNichtLautGroesse(teil, k.groessenprofil)) return 'groesse';
  if (!KLEIDUNG.includes(teil.kategorie)) return null;
  if (Math.abs(teil.waermegrad - k.zielWaerme) > 1) return 'waerme';
  if (teil.formalitaet < k.formalitaet) return 'formalitaet';
  return null;
}

export interface Gefiltert {
  erlaubt: Kleidungsstueck[];
  /** Häufigster Ausschlussgrund – für den Hinweis, was im Schrank fehlt */
  hauptgrund: Ausschluss | null;
}

/**
 * Filtert eine Kategorie. Bei erwartetem Regen bleiben für Jacke und Schuhe nur regentaugliche
 * Teile übrig – sofern es überhaupt eine regentaugliche Alternative gibt.
 */
export function filtereKategorie(
  teile: readonly Kleidungsstueck[],
  kategorie: Kategorie,
  k: FilterKontext,
): Gefiltert {
  const zaehler = new Map<Ausschluss, number>();
  let erlaubt = teile.filter((t) => {
    if (t.kategorie !== kategorie) return false;
    const grund = ausschlussgrund(t, k);
    if (grund) zaehler.set(grund, (zaehler.get(grund) ?? 0) + 1);
    return grund === null;
  });

  if (k.regen && (kategorie === 'jacke' || kategorie === 'schuhe')) {
    const regenfest = erlaubt.filter((t) => t.regentauglich);
    if (regenfest.length > 0) {
      const raus = erlaubt.length - regenfest.length;
      if (raus > 0) zaehler.set('nicht_regentauglich', raus);
      erlaubt = regenfest;
    }
  }

  const hauptgrund = [...zaehler.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  return { erlaubt, hauptgrund };
}
