import { harmonieren } from '../farbe/farbharmonie';
import { feedbackWert, type FeedbackGewichte, type OutfitHistorie } from '../lernen/feedback';
import type {
  Formalitaet,
  Groessenprofil,
  Kategorie,
  Kleidungsstueck,
  LokalesDatum,
  StilTag,
  Stilprofil,
  TrageEintrag,
  Waermegrad,
} from '../modell/typen';
import {
  istKurzVorSchwelle,
  effektiveSchwelle,
  tragestatistik,
  type Schwellen,
} from '../waesche/waescheregel';
import { zielWaermegrad, type Wetterlage } from '../wetter/wetter';
import { begruendung, titel, type BegruendungsKontext } from './begruendung';
import { kombinationsSchluessel, zufallAus } from './determinismus';
import {
  GEWICHTE,
  MAX_GLEICHES_TEIL,
  REGEN_AB,
  STANDARD_ANZAHL,
  VOLLER_BONUS_NACH_TAGEN,
  VORAUSWAHL,
  type Kriterium,
} from './gewichte';
import { filtereKategorie, type Ausschluss, type FilterKontext } from './hartefilter';
import { waehleSchmuck } from './schmuck';

export interface EngineWetter {
  gefuehltMin: number;
  gefuehltMax: number;
  regenrisiko: number;
  regenAb: string | null;
  lage: Wetterlage;
}

export interface EngineEingabe {
  datum: LokalesDatum;
  teile: readonly Kleidungsstueck[];
  trageEintraege: readonly TrageEintrag[];
  historie: readonly OutfitHistorie[];
  schwellen: Schwellen;
  groessenprofil: readonly Groessenprofil[];
  stilprofil: readonly Stilprofil[];
  /** Optionaler Stil nur für heute (D3) – ersetzt dann das Stilprofil */
  stilHeute: StilTag | null;
  /** null: ohne Wetter wird für Übergangswetter ohne Regen vorgeschlagen */
  wetter: EngineWetter | null;
  anlass: { formalitaet: Formalitaet; ausTermin: boolean };
  feedback: FeedbackGewichte;
  anzahl?: number;
}

export interface Kandidat {
  schluessel: string;
  oberteil: Kleidungsstueck;
  hose: Kleidungsstueck;
  jacke: Kleidungsstueck | null;
  schuhe: Kleidungsstueck | null;
  schmuck: Kleidungsstueck[];
  score: number;
  anteile: Record<Kriterium, number>;
  titel: string;
  begruendung: string;
}

export interface Fehlend {
  kategorie: Kategorie;
  grund: Ausschluss | 'keine_teile';
}

export interface EngineErgebnis {
  kandidaten: Kandidat[];
  /** Was für ein Outfit fehlt – nur für Oberteil und Hose (Pflicht) */
  fehlend: Fehlend[];
  zielWaerme: Waermegrad;
  regen: boolean;
}

function tageZwischen(a: LokalesDatum, b: LokalesDatum): number {
  return Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86_400_000);
}

interface TeilInfo {
  teil: Kleidungsstueck;
  tageOhneTragen: number;
  inLetzten3Tagen: boolean;
  kurzVorSchwelle: boolean;
  vorwert: number;
}

/**
 * Die eine Engine (B1). Liefert eine sortierte, pro Tag deterministische Liste der besten
 * Kombinationen. Funktioniert vollständig ohne Netz und ohne Sprachmodell.
 */
export function kandidatenFuerTag(e: EngineEingabe): EngineErgebnis {
  const zielWaerme: Waermegrad = e.wetter ? zielWaermegrad(e.wetter) : 1;
  const regen = (e.wetter?.regenrisiko ?? 0) >= REGEN_AB;
  const filter: FilterKontext = {
    zielWaerme,
    formalitaet: e.anlass.formalitaet,
    regen,
    groessenprofil: e.groessenprofil,
  };

  // Bestand und Seed: gleicher Tag, gleicher Bestand – gleiche Liste, auch nach einem Neustart.
  const seed = `${e.datum}:${e.teile
    .map((t) => `${t.id}:${t.waeschestatus}:${t.status}`)
    .sort()
    .join(',')}`;

  const info = (t: Kleidungsstueck): TeilInfo => {
    const st = tragestatistik(t, e.trageEintraege);
    const seit = st.zuletztGetragen ?? t.angelegtAm.slice(0, 10);
    const tage = Math.max(0, tageZwischen(seit, e.datum));
    const ohne = st.zuletztGetragen === null ? Math.min(tage, VOLLER_BONUS_NACH_TAGEN) : tage;
    return {
      teil: t,
      tageOhneTragen: ohne,
      inLetzten3Tagen:
        st.zuletztGetragen !== null && tageZwischen(st.zuletztGetragen, e.datum) <= 3,
      kurzVorSchwelle: istKurzVorSchwelle(
        st.getragenSeitWaesche,
        effektiveSchwelle(t, e.schwellen),
      ),
      vorwert:
        Math.min(ohne, VOLLER_BONUS_NACH_TAGEN) / VOLLER_BONUS_NACH_TAGEN +
        (t.formalitaet === e.anlass.formalitaet ? 0.5 : 0) +
        (t.waermegrad === zielWaerme ? 0.3 : 0) +
        (e.feedback.teile.get(t.id) ?? 0) * 0.5 +
        zufallAus(`${seed}:${t.id}`) * 0.1,
    };
  };

  const kategorie = (k: keyof typeof VORAUSWAHL) => {
    const f = filtereKategorie(e.teile, k, filter);
    const infos = f.erlaubt.map(info).sort((a, b) => b.vorwert - a.vorwert);
    return {
      infos: infos.slice(0, VORAUSWAHL[k]),
      hauptgrund: f.hauptgrund,
      vorhanden: e.teile.some((t) => t.kategorie === k),
    };
  };

  const oberteile = kategorie('oberteil');
  const hosen = kategorie('hose');
  const jacken = kategorie('jacke');
  const schuhe = kategorie('schuhe');
  const schmuck = filtereKategorie(e.teile, 'schmuck', filter).erlaubt;

  const fehlend: Fehlend[] = [];
  for (const [k, c] of [
    ['oberteil', oberteile],
    ['hose', hosen],
  ] as const) {
    if (c.infos.length === 0)
      fehlend.push({
        kategorie: k,
        grund: c.vorhanden ? (c.hauptgrund ?? 'keine_teile') : 'keine_teile',
      });
  }
  if (fehlend.length > 0) return { kandidaten: [], fehlend, zielWaerme, regen };

  // Jacke: Pflicht bei Kälte oder Regen (falls vorhanden), optional bei Übergang, weg im Sommer.
  const jackePflicht = zielWaerme >= 2 || regen;
  const jackenOptionen: (TeilInfo | null)[] =
    jackePflicht && jacken.infos.length > 0
      ? jacken.infos
      : zielWaerme === 0 && !regen
        ? [null]
        : [null, ...jacken.infos];
  const schuhOptionen: (TeilInfo | null)[] = schuhe.infos.length > 0 ? schuhe.infos : [null];

  const stile = e.stilHeute
    ? new Map<StilTag, number>([[e.stilHeute, 1]])
    : new Map(
        e.stilprofil
          .filter((s) => !s.geloescht)
          .map((s) => [s.stil, s.gewichtung === 'hauptsaechlich' ? 1 : 0.5]),
      );

  const letzte14 = new Set(
    e.historie
      .filter((o) => o.getragen && tageZwischen(o.datum, e.datum) <= 14 && o.datum !== e.datum)
      .map((o) => o.kombinationsSchluessel),
  );

  const alle: Omit<Kandidat, 'schmuck' | 'titel' | 'begruendung'>[] = [];
  for (const o of oberteile.infos) {
    for (const h of hosen.infos) {
      for (const j of jackenOptionen) {
        for (const s of schuhOptionen) {
          const teile = [o, h, j, s].filter((x): x is TeilInfo => x !== null);
          const kleidung = teile.map((x) => x.teil);
          const schluessel = kombinationsSchluessel(kleidung.map((t) => t.id));
          const anteile = bewerte(teile, [o.teil, h.teil, j?.teil ?? null], {
            formalitaet: e.anlass.formalitaet,
            zielWaerme,
            stile,
            letzte14: letzte14.has(schluessel),
            feedback: feedbackWert(e.feedback, kleidung, schluessel),
          });
          const score =
            Object.values(anteile).reduce((a, b) => a + b, 0) +
            zufallAus(`${seed}:${schluessel}`) * 0.5;
          alle.push({
            schluessel,
            oberteil: o.teil,
            hose: h.teil,
            jacke: j?.teil ?? null,
            schuhe: s?.teil ?? null,
            score,
            anteile,
          });
        }
      }
    }
  }

  alle.sort((a, b) => b.score - a.score);

  // Abwechslung: dasselbe Oberteil bzw. dieselbe Hose höchstens dreimal im Stapel. Jacke und
  // Schuhe sind ausgenommen – wer nur ein Paar Schuhe hat, braucht sie in jedem Outfit.
  // Reicht das nicht für einen vollen Stapel, wird mit den nächstbesten aufgefüllt.
  const anzahl = e.anzahl ?? STANDARD_ANZAHL;
  const vorkommen = new Map<string, number>();
  const auswahl: typeof alle = [];
  for (const k of alle) {
    if (auswahl.length >= anzahl) break;
    const ids = [k.oberteil.id, k.hose.id];
    if (ids.some((id) => (vorkommen.get(id) ?? 0) >= MAX_GLEICHES_TEIL)) continue;
    ids.forEach((id) => vorkommen.set(id, (vorkommen.get(id) ?? 0) + 1));
    auswahl.push(k);
  }
  for (const k of alle) {
    if (auswahl.length >= anzahl) break;
    if (!auswahl.includes(k)) auswahl.push(k);
  }
  auswahl.sort((a, b) => b.score - a.score);

  const kontext: BegruendungsKontext = {
    formalitaet: e.anlass.formalitaet,
    anlassAusTermin: e.anlass.ausTermin,
    zielWaerme,
    regen,
    regenAb: e.wetter?.regenAb ?? null,
    gefuehltMin: e.wetter?.gefuehltMin ?? null,
    gefuehltMax: e.wetter?.gefuehltMax ?? null,
    lage: e.wetter?.lage ?? null,
  };
  const infoNachId = new Map(
    [...oberteile.infos, ...hosen.infos, ...jacken.infos, ...schuhe.infos].map((x) => [
      x.teil.id,
      x,
    ]),
  );

  return {
    zielWaerme,
    regen,
    fehlend: [],
    kandidaten: auswahl.map((k) => {
      const haupt = [k.oberteil, k.hose, k.jacke, k.schuhe].filter(
        (t): t is Kleidungsstueck => t !== null,
      );
      const aeltestes = haupt
        .map((t) => infoNachId.get(t.id)!)
        .sort((a, b) => b.tageOhneTragen - a.tageOhneTragen)[0]!;
      return {
        ...k,
        schmuck: waehleSchmuck(schmuck, e.anlass.formalitaet, `${seed}:${k.schluessel}`),
        titel: titel(kontext),
        begruendung: begruendung(
          {
            oberteil: k.oberteil,
            hose: k.hose,
            jacke: k.jacke,
            schuhe: k.schuhe,
            wiederentdeckt: { teil: aeltestes.teil, tage: aeltestes.tageOhneTragen },
          },
          kontext,
        ),
      };
    }),
  };
}

interface BewertungsKontext {
  formalitaet: Formalitaet;
  zielWaerme: Waermegrad;
  stile: ReadonlyMap<StilTag, number>;
  letzte14: boolean;
  feedback: number;
}

/** Jedes Kriterium einzeln, damit nachvollziehbar bleibt, warum ein Outfit vorn liegt. */
function bewerte(
  teile: readonly TeilInfo[],
  farbig: readonly [Kleidungsstueck, Kleidungsstueck, Kleidungsstueck | null],
  k: BewertungsKontext,
): Record<Kriterium, number> {
  // Farbharmonie über Oberteil, Hose und Jacke: Anteil der harmonierenden Paare.
  const f = farbig.filter((t): t is Kleidungsstueck => t !== null);
  let paare = 0;
  let gut = 0;
  for (let i = 0; i < f.length; i++) {
    for (let j = i + 1; j < f.length; j++) {
      paare++;
      if (
        harmonieren(
          { hex: f[i]!.farbeHex, name: f[i]!.farbeName },
          { hex: f[j]!.farbeHex, name: f[j]!.farbeName },
        )
      )
        gut++;
    }
  }

  const n = teile.length;
  const mittel = (fn: (x: TeilInfo) => number) => teile.reduce((a, x) => a + fn(x), 0) / n;

  // Stil: nur Teile mit Tags zählen; Teile ohne Tags sind neutral.
  const mitTags = teile.filter((x) => x.teil.stilTags.length > 0);
  const stil =
    k.stile.size === 0 || mitTags.length === 0
      ? 0
      : mitTags.reduce(
          (a, x) => a + Math.max(0, ...x.teil.stilTags.map((t) => k.stile.get(t) ?? 0)),
          0,
        ) / mitTags.length;

  return {
    farbharmonie: paare === 0 ? GEWICHTE.farbharmonie : (GEWICHTE.farbharmonie * gut) / paare,
    langeNichtGetragen:
      GEWICHTE.langeNichtGetragen *
      mittel((x) => Math.min(x.tageOhneTragen, VOLLER_BONUS_NACH_TAGEN) / VOLLER_BONUS_NACH_TAGEN),
    stilprofil: GEWICHTE.stilprofil * stil,
    formalitaetExakt:
      GEWICHTE.formalitaetExakt * mittel((x) => (x.teil.formalitaet === k.formalitaet ? 1 : 0)),
    waermeExakt: GEWICHTE.waermeExakt * mittel((x) => (x.teil.waermegrad === k.zielWaerme ? 1 : 0)),
    gleicheKombination14Tage: k.letzte14 ? GEWICHTE.gleicheKombination14Tage : 0,
    teilLetzte3Tage: teile.some((x) => x.inLetzten3Tagen) ? GEWICHTE.teilLetzte3Tage : 0,
    kurzVorWaescheschwelle: teile.some((x) => x.kurzVorSchwelle)
      ? GEWICHTE.kurzVorWaescheschwelle
      : 0,
    feedback: GEWICHTE.feedback * k.feedback,
  };
}
