import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useMemo } from 'react';

import { toDomain } from '@/data/repositories/garment-repository';
import {
  outfitPartsQuery,
  outfitsOfDayQuery,
  toOutfitDomain,
} from '@/data/repositories/outfit-repository';
import { allGarmentsQuery } from '@/data/repositories/profile-queries';
import type { Kleidungsstueck, LokalesDatum, Outfit, Rolle } from '@/domain/modell/typen';

export interface OutfitMitTeilen {
  outfit: Outfit;
  teile: { rolle: Rolle; teil: Kleidungsstueck }[];
}

export interface Tageswahl {
  /** Alle heute bewerteten Outfits, nach Kombination */
  bewertet: Map<string, OutfitMitTeilen>;
  wahl: OutfitMitTeilen | null;
}

const ROLLEN_REIHENFOLGE: Rolle[] = [
  'oberteil',
  'hose',
  'jacke',
  'schuhe',
  'accessoire',
  'schmuck',
];

/** Die Tageswahl lebt in der Datenbank: übersteht jeden Neustart und verfällt mit dem Datum. */
export function useDailyChoice(datum: LokalesDatum): Tageswahl {
  const { data: outfits } = useLiveQuery(outfitsOfDayQuery(datum), [datum]);
  const ids = useMemo(() => outfits.map((o) => o.id), [outfits]);
  const { data: teilRows } = useLiveQuery(outfitPartsQuery(ids), [ids.join(',')]);
  const { data: garments } = useLiveQuery(allGarmentsQuery());

  return useMemo(() => {
    const nachId = new Map(garments.map((g) => [g.id, toDomain(g)]));
    const bewertet = new Map<string, OutfitMitTeilen>();
    let wahl: OutfitMitTeilen | null = null;
    for (const row of outfits) {
      const o = toOutfitDomain(row);
      const teile = teilRows
        .filter((t) => t.outfitId === o.id)
        .map((t) => ({ rolle: t.rolle, teil: nachId.get(t.teilId) }))
        .filter((x): x is { rolle: Rolle; teil: Kleidungsstueck } => x.teil !== undefined)
        .sort((a, b) => ROLLEN_REIHENFOLGE.indexOf(a.rolle) - ROLLEN_REIHENFOLGE.indexOf(b.rolle));
      const eintrag = { outfit: o, teile };
      bewertet.set(o.kombinationsSchluessel, eintrag);
      if (o.istTageswahl) wahl = eintrag;
    }
    return { bewertet, wahl };
  }, [outfits, teilRows, garments]);
}
