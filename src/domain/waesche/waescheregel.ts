import { STANDARD_SCHWELLEN } from '../modell/konstanten';
import type {
  IsoZeitpunkt,
  Kategorie,
  Kleidungsstueck,
  LokalesDatum,
  Tragestatistik,
  TrageEintrag,
  Waeschestatus,
} from '../modell/typen';

export type Schwellen = Partial<Record<Kategorie, number>>;

/** Eigene Schwelle des Teils vor der Kategorie, die Kategorie vor dem Standard. 0 = nie waschen. */
export function effektiveSchwelle(teil: Kleidungsstueck, schwellen: Schwellen): number {
  return (
    teil.waescheschwelleEigen ?? schwellen[teil.kategorie] ?? STANDARD_SCHWELLEN[teil.kategorie]
  );
}

/**
 * Zählt aus den Trageeinträgen statt aus einem gespeicherten Zähler, damit zwei Geräte
 * sich beim Sync nicht gegenseitig Tragevorgänge überschreiben.
 * Seit der Wäsche zählt, was nach gewaschenAm angelegt wurde.
 */
export function tragestatistik(
  teil: Kleidungsstueck,
  eintraege: readonly TrageEintrag[],
): Tragestatistik {
  const eigene = eintraege.filter((e) => e.teilId === teil.id && !e.geloescht);
  let zuletzt: LokalesDatum | null = null;
  let seitWaesche = 0;
  for (const e of eigene) {
    if (zuletzt === null || e.datum > zuletzt) zuletzt = e.datum;
    if (teil.gewaschenAm === null || e.angelegtAm > teil.gewaschenAm) seitWaesche++;
  }
  return {
    getragenGesamt: eigene.length,
    getragenSeitWaesche: seitWaesche,
    zuletztGetragen: zuletzt,
  };
}

/** Verfügbar für Vorschläge ist nur, was aktiv, nicht gelöscht und sauber ist. */
export function istVerfuegbar(teil: Kleidungsstueck): boolean {
  return !teil.geloescht && teil.status === 'aktiv' && teil.waeschestatus === 'sauber';
}

/** Ein Tragen vor der Schwelle – für den Abzug "kurz vor der Wäscheschwelle" in der Engine. */
export function istKurzVorSchwelle(seitWaesche: number, schwelle: number): boolean {
  return schwelle > 1 && seitWaesche === schwelle - 1;
}

export interface TragenPlan {
  /** true, wenn für diesen Tag schon ein Eintrag besteht – dann ändert sich nichts. */
  schonGetragen: boolean;
  neuerWaeschestatus: Waeschestatus;
}

/**
 * Was passiert, wenn das Teil am Tag `datum` getragen wird.
 * Ein Teil zählt pro Tag nur einmal. Erreicht es die Schwelle, wandert es in den Korb.
 */
export function planeTragen(
  teil: Kleidungsstueck,
  datum: LokalesDatum,
  eintraege: readonly TrageEintrag[],
  schwellen: Schwellen,
): TragenPlan {
  const schonGetragen = eintraege.some(
    (e) => e.teilId === teil.id && e.datum === datum && !e.geloescht,
  );
  if (schonGetragen) return { schonGetragen, neuerWaeschestatus: teil.waeschestatus };

  const schwelle = effektiveSchwelle(teil, schwellen);
  const nachher = tragestatistik(teil, eintraege).getragenSeitWaesche + 1;
  const neuerWaeschestatus =
    schwelle > 0 && nachher >= schwelle && teil.waeschestatus === 'sauber'
      ? 'korb'
      : teil.waeschestatus;
  return { schonGetragen, neuerWaeschestatus };
}

export interface WaescheAenderung {
  waeschestatus: Waeschestatus;
  gewaschenAm: IsoZeitpunkt | null;
}

/** In den Korb, in die Maschine oder wieder sauber. Sauber setzt den Zähler seit der Wäsche zurück. */
export function setzeWaeschestatus(
  teil: Kleidungsstueck,
  ziel: Waeschestatus,
  jetzt: IsoZeitpunkt,
): WaescheAenderung {
  if (ziel === 'sauber' && teil.waeschestatus !== 'sauber') {
    return { waeschestatus: 'sauber', gewaschenAm: jetzt };
  }
  return { waeschestatus: ziel, gewaschenAm: teil.gewaschenAm };
}
