import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useMemo } from 'react';

import { activeGarmentsQuery, toDomain } from '@/data/repositories/garment-repository';
import type { Kleidungsstueck } from '@/domain/modell/typen';

export function useActiveGarments(): Kleidungsstueck[] {
  const { data } = useLiveQuery(activeGarmentsQuery());
  return useMemo(() => data.map(toDomain), [data]);
}
