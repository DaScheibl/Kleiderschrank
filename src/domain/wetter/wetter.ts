import type { IsoZeitpunkt, LokalesDatum, Waermegrad } from '../modell/typen';
import { lokalesDatum } from '../zeit';

/** Eine Vorhersagestunde, wie der Wetter-Proxy sie liefert. */
export interface WetterStunde {
  zeit: IsoZeitpunkt;
  temperatur: number | null;
  /** Gefühlte Temperatur von MET Norway, falls vorhanden */
  gefuehlt: number | null;
  windMs: number | null;
  feuchte: number | null;
  niederschlagMm: number | null;
  /** 0–100; außerhalb Skandinaviens liefert MET das meist nicht */
  wahrscheinlichkeit: number | null;
  symbol: string;
}

export const WETTERLAGEN = [
  'gewitter',
  'schnee',
  'schneeregen',
  'regen',
  'nebel',
  'bewoelkt',
  'heiter',
  'sonnig',
] as const;
export type Wetterlage = (typeof WETTERLAGEN)[number];

export interface WetterTag {
  datum: LokalesDatum;
  /** true, wenn der heutige Tag (7–22 Uhr) schon vorbei ist und morgen gemeint ist */
  fuerMorgen: boolean;
  gefuehltMin: number;
  gefuehltMax: number;
  /** 0–1 */
  regenrisiko: number;
  /** true, wenn das Risiko aus Menge und Symbol geschätzt statt geliefert ist */
  regenGeschaetzt: boolean;
  /** "14:00" – erste Stunde mit Regenrisiko ab 50 % */
  regenAb: string | null;
  windMaxKmh: number;
  lage: Wetterlage;
  verlauf: { uhrzeit: string; gefuehlt: number }[];
}

/** Stunden, in denen man draußen ist und die Kleidung zählt. */
const TAG_VON = 7;
const TAG_BIS = 22;

/**
 * Gefühlte Temperatur nach Steadman (ohne Strahlung), wie sie auch Open-Meteo und das
 * australische BoM verwenden. Bezieht Wind und Luftfeuchte ein.
 */
export function gefuehlteTemperatur(
  temperatur: number,
  windMs: number,
  feuchteProzent: number,
): number {
  const dampfdruck =
    (feuchteProzent / 100) * 6.105 * Math.exp((17.27 * temperatur) / (237.7 + temperatur));
  return temperatur + 0.33 * dampfdruck - 0.7 * windMs - 4.0;
}

function gefuehltDerStunde(s: WetterStunde): number | null {
  if (s.gefuehlt !== null) return s.gefuehlt;
  if (s.temperatur === null) return null;
  return gefuehlteTemperatur(s.temperatur, s.windMs ?? 0, s.feuchte ?? 70);
}

const NIEDERSCHLAG = /thunder|snow|sleet|rain/;

/** Liefert MET keine Wahrscheinlichkeit, wird sie aus Menge und Symbol geschätzt. */
export function regenrisikoDerStunde(s: WetterStunde): { risiko: number; geschaetzt: boolean } {
  if (s.wahrscheinlichkeit !== null) {
    return { risiko: Math.min(1, Math.max(0, s.wahrscheinlichkeit / 100)), geschaetzt: false };
  }
  const mm = s.niederschlagMm ?? 0;
  let risiko = 0;
  if (mm >= 1) risiko = 0.9;
  else if (mm >= 0.3) risiko = 0.7;
  else if (mm >= 0.1) risiko = 0.5;
  else if (mm > 0) risiko = 0.3;
  else if (NIEDERSCHLAG.test(s.symbol)) risiko = 0.4;
  return { risiko, geschaetzt: true };
}

export function lageAusSymbol(symbol: string): Wetterlage {
  if (symbol.includes('thunder')) return 'gewitter';
  if (symbol.includes('snow')) return 'schnee';
  if (symbol.includes('sleet')) return 'schneeregen';
  if (symbol.includes('rain')) return 'regen';
  if (symbol.includes('fog')) return 'nebel';
  if (symbol.includes('partlycloudy') || symbol.includes('fair')) return 'heiter';
  if (symbol.includes('cloudy')) return 'bewoelkt';
  return 'sonnig';
}

function lageDesTages(stunden: readonly WetterStunde[], risiken: readonly number[]): Wetterlage {
  // Regnet es wahrscheinlich, zählt die schwerste Niederschlagsart; sonst die häufigste Lage.
  const nass = stunden.filter((_, i) => risiken[i]! >= 0.5).map((s) => lageAusSymbol(s.symbol));
  const niederschlag = nass.filter((l) =>
    ['gewitter', 'schnee', 'schneeregen', 'regen'].includes(l),
  );
  if (niederschlag.length > 0) {
    return WETTERLAGEN.find((l) => niederschlag.includes(l))!;
  }
  const zaehler = new Map<Wetterlage, number>();
  for (const s of stunden) {
    const l = lageAusSymbol(s.symbol);
    const trocken = ['gewitter', 'schnee', 'schneeregen', 'regen'].includes(l) ? 'bewoelkt' : l;
    zaehler.set(trocken, (zaehler.get(trocken) ?? 0) + 1);
  }
  return [...zaehler.entries()].sort((a, b) => b[1] - a[1])[0]![0];
}

function uhrzeit(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:00`;
}

/**
 * Fasst die Vorhersage für den heutigen Tag (7–22 Uhr, ab der aktuellen Stunde) zusammen.
 * Ist der Tag schon vorbei, wird der morgige zusammengefasst.
 */
export function tageswetter(stunden: readonly WetterStunde[], jetzt: Date): WetterTag | null {
  const heute = lokalesDatum(jetzt);
  const morgen = lokalesDatum(new Date(jetzt.getFullYear(), jetzt.getMonth(), jetzt.getDate() + 1));

  const imFenster = (datum: string, abStunde: number) =>
    stunden.filter((s) => {
      const d = new Date(s.zeit);
      const h = d.getHours();
      return lokalesDatum(d) === datum && h >= Math.max(TAG_VON, abStunde) && h <= TAG_BIS;
    });

  let fuerMorgen = false;
  let auswahl = imFenster(heute, jetzt.getHours());
  if (auswahl.length === 0) {
    fuerMorgen = true;
    auswahl = imFenster(morgen, 0);
  }

  const mitWert = auswahl
    .map((s) => ({ s, gefuehlt: gefuehltDerStunde(s) }))
    .filter((x): x is { s: WetterStunde; gefuehlt: number } => x.gefuehlt !== null);
  if (mitWert.length === 0) return null;

  const regen = mitWert.map((x) => regenrisikoDerStunde(x.s));
  const risiken = regen.map((r) => r.risiko);
  const ersteNasse = mitWert.findIndex((_, i) => risiken[i]! >= 0.5);
  const werte = mitWert.map((x) => x.gefuehlt);
  const runde = (x: number) => Math.round(x * 10) / 10;

  return {
    datum: fuerMorgen ? morgen : heute,
    fuerMorgen,
    gefuehltMin: runde(Math.min(...werte)),
    gefuehltMax: runde(Math.max(...werte)),
    regenrisiko: Math.max(...risiken),
    regenGeschaetzt: regen.some((r) => r.geschaetzt),
    regenAb: ersteNasse >= 0 ? uhrzeit(new Date(mitWert[ersteNasse]!.s.zeit)) : null,
    windMaxKmh: Math.round(Math.max(...mitWert.map((x) => (x.s.windMs ?? 0) * 3.6))),
    lage: lageDesTages(
      mitWert.map((x) => x.s),
      risiken,
    ),
    verlauf: mitWert.map((x) => ({
      uhrzeit: uhrzeit(new Date(x.s.zeit)),
      gefuehlt: runde(x.gefuehlt),
    })),
  };
}

/**
 * Ziel-Wärmegrad für die Kleidung. Gewichtet zur kälteren Tageszeit hin, weil man sich
 * morgens anzieht und abends noch draußen sein kann.
 */
export function zielWaermegrad(tag: Pick<WetterTag, 'gefuehltMin' | 'gefuehltMax'>): Waermegrad {
  const mass = (2 * tag.gefuehltMin + tag.gefuehltMax) / 3;
  if (mass >= 20) return 0;
  if (mass >= 13) return 1;
  if (mass >= 5) return 2;
  return 3;
}

export const WETTERLAGE_NAMEN: Record<Wetterlage, string> = {
  gewitter: 'Gewitter',
  schnee: 'Schnee',
  schneeregen: 'Schneeregen',
  regen: 'Regen',
  nebel: 'Nebel',
  bewoelkt: 'Bewölkt',
  heiter: 'Heiter',
  sonnig: 'Sonnig',
};
