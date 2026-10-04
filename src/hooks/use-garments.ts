import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useMemo } from 'react';

import {
  activeGarmentsQuery,
  garmentQuery,
  garmentsByLaundryStatusQuery,
  toDomain,
} from '@/data/repositories/garment-repository';
import { thresholdsQuery, toThresholds } from '@/data/repositories/profile-repository';
import { toWearDomain, wearsForGarmentQuery } from '@/data/repositories/wear-repository';
import type { Kleidungsstueck, Tragestatistik, Uuid, Waeschestatus } from '@/domain/modell/typen';
import { effektiveSchwelle, tragestatistik, type Schwellen } from '@/domain/waesche/waescheregel';

export function useActiveGarments(): Kleidungsstueck[] {
  const { data } = useLiveQuery(activeGarmentsQuery());
  return useMemo(() => data.map(toDomain), [data]);
}

export function useGarmentsInLaundry(status: Waeschestatus): Kleidungsstueck[] {
  const { data } = useLiveQuery(garmentsByLaundryStatusQuery(status), [status]);
  return useMemo(() => data.map(toDomain), [data]);
}

export function useThresholds(): Schwellen {
  const { data } = useLiveQuery(thresholdsQuery());
  return useMemo(() => toThresholds(data), [data]);
}

export interface GarmentDetail {
  teil: Kleidungsstueck;
  statistik: Tragestatistik;
  schwelle: number;
}

export function useGarmentDetail(id: Uuid): GarmentDetail | null {
  const { data: teilRows } = useLiveQuery(garmentQuery(id), [id]);
  const { data: wearRows } = useLiveQuery(wearsForGarmentQuery(id), [id]);
  const schwellen = useThresholds();

  return useMemo(() => {
    const row = teilRows[0];
    if (!row) return null;
    const teil = toDomain(row);
    return {
      teil,
      statistik: tragestatistik(teil, wearRows.map(toWearDomain)),
      schwelle: effektiveSchwelle(teil, schwellen),
    };
  }, [teilRows, wearRows, schwellen]);
}
