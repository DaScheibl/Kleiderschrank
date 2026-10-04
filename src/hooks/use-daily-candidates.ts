import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useMemo } from 'react';

import { toDomain } from '@/data/repositories/garment-repository';
import { historyQuery, outfitPartsQuery, toHistory } from '@/data/repositories/outfit-repository';
import {
  allGarmentsQuery,
  allWearsQuery,
  sizeProfileQuery,
  styleProfileQuery,
} from '@/data/repositories/profile-queries';
import { toWearDomain } from '@/data/repositories/wear-repository';
import { kandidatenFuerTag, type EngineErgebnis } from '@/domain/engine/kandidaten';
import { lerneAusFeedback } from '@/domain/lernen/feedback';
import type { Formalitaet, LokalesDatum } from '@/domain/modell/typen';
import { lokalesDatum } from '@/domain/zeit';

import { useThresholds } from './use-garments';
import { useOccasion, type AnlassAnzeige } from './use-occasion';
import { useWeather, type WetterAnzeige } from './use-weather';

/** Vorläufige Stapelgröße, bis E10 (Kartenzahl im Free-Stapel) entschieden ist. */
export const STAPEL_GROESSE = 10;

/** Lernen und Wiederholungssperre schauen so weit zurück. */
const HISTORIE_TAGE = 60;

export interface Tageskandidaten {
  bereit: boolean;
  ergebnis: EngineErgebnis | null;
  anlass: { formalitaet: Formalitaet; ausTermin: boolean };
  wetter: WetterAnzeige;
  anlassAnzeige: AnlassAnzeige;
}

function tageVorher(datum: LokalesDatum, tage: number): LokalesDatum {
  const [j, m, t] = datum.split('-').map(Number);
  return lokalesDatum(new Date(j!, m! - 1, t! - tage));
}

/**
 * Die eine Kandidatenliste des Tages (B1). Heute- und Outfit-Screen nutzen genau diese.
 * Feedback zählt bis gestern, damit der Stapel beim Wischen nicht umsortiert.
 */
export function useDailyCandidates(datum: LokalesDatum): Tageskandidaten {
  const wetter = useWeather();
  const anlassAnzeige = useOccasion();
  const schwellen = useThresholds();

  const { data: teileRows } = useLiveQuery(allGarmentsQuery());
  const { data: wearRows } = useLiveQuery(allWearsQuery());
  const { data: groessen } = useLiveQuery(sizeProfileQuery());
  const { data: stile } = useLiveQuery(styleProfileQuery());
  const { data: historieRows } = useLiveQuery(
    historyQuery(tageVorher(datum, HISTORIE_TAGE), datum),
    [datum],
  );
  const outfitIds = useMemo(() => historieRows.map((o) => o.id), [historieRows]);
  const { data: teilRows } = useLiveQuery(outfitPartsQuery(outfitIds), [outfitIds.join(',')]);

  const bereit = wetter.zustand !== 'laedt' && anlassAnzeige.zugang !== 'laedt';
  const anlass = useMemo(
    () => ({
      formalitaet: anlassAnzeige.anlass.formalitaet,
      ausTermin: anlassAnzeige.anlass.quelle === 'termin',
    }),
    [anlassAnzeige.anlass],
  );

  const ergebnis = useMemo(() => {
    if (!bereit) return null;
    const teile = teileRows.map(toDomain);
    const historie = toHistory(historieRows, teilRows);
    const tag = wetter.tag;
    return kandidatenFuerTag({
      datum,
      teile,
      trageEintraege: wearRows.map(toWearDomain),
      historie,
      schwellen,
      groessenprofil: groessen,
      stilprofil: stile,
      stilHeute: null,
      wetter: tag
        ? {
            gefuehltMin: tag.gefuehltMin,
            gefuehltMax: tag.gefuehltMax,
            regenrisiko: tag.regenrisiko,
            regenAb: tag.regenAb,
            lage: tag.lage,
          }
        : null,
      anlass,
      feedback: lerneAusFeedback(historie, new Map(teile.map((t) => [t.id, t])), datum),
      anzahl: STAPEL_GROESSE,
    });
  }, [
    bereit,
    teileRows,
    wearRows,
    historieRows,
    teilRows,
    groessen,
    stile,
    schwellen,
    wetter.tag,
    anlass,
    datum,
  ]);

  return { bereit, ergebnis, anlass, wetter, anlassAnzeige };
}
