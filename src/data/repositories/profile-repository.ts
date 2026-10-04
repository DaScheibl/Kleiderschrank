import { eq } from 'drizzle-orm';

import type { Kategorie } from '@/domain/modell/typen';
import type { Schwellen } from '@/domain/waesche/waescheregel';

import { db } from '../db/client';
import { waescheschwelle } from '../db/schema';

type Reader = Pick<typeof db, 'select'>;

export function thresholdsQuery() {
  return db.select().from(waescheschwelle).where(eq(waescheschwelle.geloescht, false));
}

export function toThresholds(rows: readonly (typeof waescheschwelle.$inferSelect)[]): Schwellen {
  const schwellen: Schwellen = {};
  for (const row of rows) if (!row.geloescht) schwellen[row.kategorie] = row.schwelle;
  return schwellen;
}

export function readThresholds(reader: Reader = db): Schwellen {
  return toThresholds(reader.select().from(waescheschwelle).all());
}

/** Überschreibt die Schwelle einer Kategorie. 0 = wird nie gewaschen. */
export function setThreshold(kategorie: Kategorie, schwelle: number): void {
  const wert = Math.max(0, Math.round(schwelle));
  const jetzt = new Date().toISOString();
  db.insert(waescheschwelle)
    .values({ kategorie, schwelle: wert, angelegtAm: jetzt, zuletztGeaendert: jetzt })
    .onConflictDoUpdate({
      target: waescheschwelle.kategorie,
      set: { schwelle: wert, geloescht: false, zuletztGeaendert: jetzt, syncOffen: true },
    })
    .run();
}
