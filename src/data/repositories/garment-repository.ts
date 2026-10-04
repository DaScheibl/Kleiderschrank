import { and, desc, eq, inArray } from 'drizzle-orm';
import { randomUUID } from 'expo-crypto';

import {
  neuesKleidungsstueck,
  type AnlegenErgebnis,
  type NeuesTeilEingabe,
} from '@/domain/kleidungsstueck/anlegen';
import type { Kleidungsstueck, Uuid, Waeschestatus } from '@/domain/modell/typen';
import { setzeWaeschestatus } from '@/domain/waesche/waescheregel';

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

export function garmentQuery(id: Uuid) {
  return db.select().from(kleidungsstueck).where(eq(kleidungsstueck.id, id)).limit(1);
}

export function garmentsByLaundryStatusQuery(status: Waeschestatus) {
  return db
    .select()
    .from(kleidungsstueck)
    .where(
      and(
        eq(kleidungsstueck.geloescht, false),
        eq(kleidungsstueck.status, 'aktiv'),
        eq(kleidungsstueck.waeschestatus, status),
      ),
    )
    .orderBy(kleidungsstueck.kategorie, kleidungsstueck.name);
}

/** Setzt den Wäschestatus mehrerer Teile in einer Transaktion. */
export function setLaundryStatus(ids: readonly Uuid[], ziel: Waeschestatus): void {
  if (ids.length === 0) return;
  const jetzt = new Date().toISOString();
  db.transaction((tx) => {
    const rows = tx
      .select()
      .from(kleidungsstueck)
      .where(inArray(kleidungsstueck.id, [...ids]))
      .all();
    for (const row of rows) {
      const aenderung = setzeWaeschestatus(toDomain(row), ziel, jetzt);
      tx.update(kleidungsstueck)
        .set({ ...aenderung, zuletztGeaendert: jetzt, syncOffen: true })
        .where(eq(kleidungsstueck.id, row.id))
        .run();
    }
  });
}
