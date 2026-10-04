import { eq } from 'drizzle-orm';

import { STANDARD_EINSTELLUNGEN } from '@/domain/modell/konstanten';
import type { Einstellungen } from '@/domain/modell/typen';

import { notifyLocalChange } from '../changes';
import { getDb } from '../db/client';
import { einstellungen } from '../db/schema';

const SCHLUESSEL = 'standard';

export function settingsQuery() {
  return getDb().select().from(einstellungen).where(eq(einstellungen.schluessel, SCHLUESSEL));
}

export function readSettings(): Omit<
  Einstellungen,
  'angelegtAm' | 'zuletztGeaendert' | 'geloescht'
> {
  const row = settingsQuery().get();
  return row ?? STANDARD_EINSTELLUNGEN;
}

type Aenderung = Partial<typeof STANDARD_EINSTELLUNGEN>;

export function updateSettings(aenderung: Aenderung): void {
  const jetzt = new Date().toISOString();
  getDb()
    .insert(einstellungen)
    .values({
      ...STANDARD_EINSTELLUNGEN,
      ...aenderung,
      schluessel: SCHLUESSEL,
      angelegtAm: jetzt,
      zuletztGeaendert: jetzt,
    })
    .onConflictDoUpdate({
      target: einstellungen.schluessel,
      set: { ...aenderung, zuletztGeaendert: jetzt, syncOffen: true },
    })
    .run();
  notifyLocalChange();
}
