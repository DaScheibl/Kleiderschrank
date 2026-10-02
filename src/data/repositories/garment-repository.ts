import { and, desc, eq } from 'drizzle-orm';
import { randomUUID } from 'expo-crypto';

import {
  neuesKleidungsstueck,
  type AnlegenErgebnis,
  type NeuesTeilEingabe,
} from '@/domain/kleidungsstueck/anlegen';
import type { Kleidungsstueck } from '@/domain/modell/typen';

import { db } from '../db/client';
import { kleidungsstueck, type KleidungsstueckZeile } from '../db/schema';

export function toDomain(row: KleidungsstueckZeile): Kleidungsstueck {
  const { syncOffen: _syncOffen, ...teil } = row;
  return teil;
}

export async function createGarment(input: NeuesTeilEingabe): Promise<AnlegenErgebnis> {
  const result = neuesKleidungsstueck(input, randomUUID(), new Date().toISOString());
  if (result.ok) {
    await db.insert(kleidungsstueck).values({ ...result.teil, syncOffen: true });
  }
  return result;
}

/** Abfrage für den Schrank: aktive, nicht gelöschte Teile, neueste zuerst. */
export function activeGarmentsQuery() {
  return db
    .select()
    .from(kleidungsstueck)
    .where(and(eq(kleidungsstueck.geloescht, false), eq(kleidungsstueck.status, 'aktiv')))
    .orderBy(desc(kleidungsstueck.angelegtAm));
}
