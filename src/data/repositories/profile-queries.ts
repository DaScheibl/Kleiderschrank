import { eq } from 'drizzle-orm';

import { getDb } from '../db/client';
import { groessenprofil, kleidungsstueck, stilprofil, trageEintrag } from '../db/schema';

export function allGarmentsQuery() {
  return getDb().select().from(kleidungsstueck).where(eq(kleidungsstueck.geloescht, false));
}

export function allWearsQuery() {
  return getDb().select().from(trageEintrag).where(eq(trageEintrag.geloescht, false));
}

export function sizeProfileQuery() {
  return getDb().select().from(groessenprofil).where(eq(groessenprofil.geloescht, false));
}

export function styleProfileQuery() {
  return getDb().select().from(stilprofil).where(eq(stilprofil.geloescht, false));
}
