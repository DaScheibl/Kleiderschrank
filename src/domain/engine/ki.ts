import type { Formalitaet, Kleidungsstueck, LokalesDatum, StilTag } from '../modell/typen';
import { hash } from './determinismus';
import type { EngineWetter, Kandidat } from './kandidaten';

// Brücke zwischen Regel-Engine und KI-Schicht (B4). Das Modell sieht keine Teilenamen,
// keine Termintitel und keine Orte – nur Art, Farbe und abstrakte Werte.

export interface KiTeil {
  rolle: 'oberteil' | 'hose' | 'jacke' | 'schuhe' | 'schmuck';
  art: string;
  farbe: string;
  muster: string;
  waerme: number;
  formal: number;
  regentauglich: boolean;
  tags: string[];
}

export interface KiEingabe {
  datum: LokalesDatum;
  bestandsPruefsumme: string;
  wetter: {
    gefuehltMin: number;
    gefuehltMax: number;
    regenrisiko: number;
    regenAb: string | null;
    windKmh: number;
    lage: string;
  } | null;
  anlass: { formalitaet: Formalitaet; quelle: 'termin' | 'alltag' };
  stile: StilTag[];
  kandidaten: { id: string; teile: KiTeil[]; regelScore: number }[];
}

export interface KiAntwort {
  reihenfolge: { id: string; titel: string; begruendung: string }[];
  tipp: string;
}

function kiTeil(rolle: KiTeil['rolle'], t: Kleidungsstueck): KiTeil {
  return {
    rolle,
    art: t.unterart ?? t.kategorie,
    farbe: t.farbeName,
    muster: t.muster,
    waerme: t.waermegrad,
    formal: t.formalitaet,
    regentauglich: t.regentauglich,
    tags: [...t.stilTags],
  };
}

/** Kurze, neutrale IDs statt der Kombinationsschlüssel – k1 bis k10. */
export function kiEingabe(
  datum: LokalesDatum,
  kandidaten: readonly Kandidat[],
  wetter: (EngineWetter & { windKmh: number }) | null,
  anlass: { formalitaet: Formalitaet; ausTermin: boolean },
  stile: readonly StilTag[],
): KiEingabe {
  const runde = (x: number) => Math.round(x);
  const wetterTeil = wetter
    ? {
        gefuehltMin: runde(wetter.gefuehltMin),
        gefuehltMax: runde(wetter.gefuehltMax),
        regenrisiko: Math.round(wetter.regenrisiko * 10) / 10,
        regenAb: wetter.regenAb,
        windKmh: runde(wetter.windKmh),
        lage: wetter.lage,
      }
    : null;
  const anlassTeil = {
    formalitaet: anlass.formalitaet,
    quelle: anlass.ausTermin ? ('termin' as const) : ('alltag' as const),
  };

  // Gleiche Kandidaten, gleiches Wetter, gleicher Anlass → gleiche Prüfsumme → Cache greift.
  const bestandsPruefsumme = hash(
    JSON.stringify([
      datum,
      kandidaten.map((k) => k.schluessel),
      wetterTeil,
      anlassTeil,
      [...stile].sort(),
    ]),
  );

  return {
    datum,
    bestandsPruefsumme,
    wetter: wetterTeil,
    anlass: anlassTeil,
    stile: [...stile],
    kandidaten: kandidaten.map((k, i) => ({
      id: `k${i + 1}`,
      regelScore: Math.round(k.score),
      teile: [
        kiTeil('oberteil', k.oberteil),
        kiTeil('hose', k.hose),
        ...(k.jacke ? [kiTeil('jacke', k.jacke)] : []),
        ...(k.schuhe ? [kiTeil('schuhe', k.schuhe)] : []),
        ...k.schmuck.map((s) => kiTeil('schmuck', s)),
      ],
    })),
  };
}

/**
 * Wendet die KI-Antwort an. Es kann nur umsortiert und umformuliert werden – Kandidaten,
 * die nicht von der Engine stammen, gibt es hier gar nicht. Leere Texte behalten die Textbausteine.
 */
export function wendeKiAn(
  kandidaten: readonly Kandidat[],
  antwort: KiAntwort,
  umsortieren: boolean,
): Kandidat[] {
  const nachId = new Map(kandidaten.map((k, i) => [`k${i + 1}`, k]));
  // Bei doppelt gelieferten IDs gilt der erste Eintrag – wie bei der Reihenfolge.
  const texte = new Map<string, KiAntwort['reihenfolge'][number]>();
  for (const r of antwort.reihenfolge) if (!texte.has(r.id)) texte.set(r.id, r);

  const mitText = (id: string, k: Kandidat): Kandidat => {
    const r = texte.get(id);
    if (!r?.begruendung) return { ...k, titel: r?.titel || k.titel };
    return { ...k, titel: r.titel || k.titel, begruendung: r.begruendung, begruendungQuelle: 'ki' };
  };

  if (!umsortieren) return kandidaten.map((k, i) => mitText(`k${i + 1}`, k));

  const ergebnis: Kandidat[] = [];
  const genutzt = new Set<string>();
  for (const r of antwort.reihenfolge) {
    const k = nachId.get(r.id);
    if (!k || genutzt.has(r.id)) continue;
    genutzt.add(r.id);
    ergebnis.push(mitText(r.id, k));
  }
  kandidaten.forEach((k, i) => {
    if (!genutzt.has(`k${i + 1}`)) ergebnis.push(mitText(`k${i + 1}`, k));
  });
  return ergebnis;
}
