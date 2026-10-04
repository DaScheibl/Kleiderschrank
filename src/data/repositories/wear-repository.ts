import { eq } from 'drizzle-orm';
import { randomUUID } from 'expo-crypto';

import type { LokalesDatum, TrageEintrag, Uuid } from '@/domain/modell/typen';
import { planeTragen, type TragenPlan } from '@/domain/waesche/waescheregel';

import { notifyLocalChange } from '../changes';
import { getDb } from '../db/client';
import { kleidungsstueck, trageEintrag } from '../db/schema';
import { toDomain } from './garment-repository';
import { readThresholds } from './profile-repository';

export function toWearDomain(row: typeof trageEintrag.$inferSelect): TrageEintrag {
  const { syncOffen: _syncOffen, ...eintrag } = row;
  return eintrag;
}

export function wearsForGarmentQuery(teilId: Uuid) {
  return getDb().select().from(trageEintrag).where(eq(trageEintrag.teilId, teilId));
}

/**
 * Trägt ein Teil an einem Tag ein und schiebt es bei erreichter Schwelle in den Korb.
 * Alles in einer Transaktion, damit Eintrag und Wäschestatus nie auseinanderlaufen.
 */
export function markWorn(
  teilId: Uuid,
  datum: LokalesDatum,
  outfitId: Uuid | null = null,
): TragenPlan | null {
  const plan = getDb().transaction((tx) => {
    const row = tx.select().from(kleidungsstueck).where(eq(kleidungsstueck.id, teilId)).get();
    if (!row) return null;
    const teil = toDomain(row);
    const eintraege = tx
      .select()
      .from(trageEintrag)
      .where(eq(trageEintrag.teilId, teilId))
      .all()
      .map(toWearDomain);

    const plan = planeTragen(teil, datum, eintraege, readThresholds(tx));
    if (plan.schonGetragen) return plan;

    const jetzt = new Date().toISOString();
    // Ein früher zurückgenommener Eintrag für denselben Tag wird reaktiviert statt neu angelegt.
    tx.insert(trageEintrag)
      .values({
        id: randomUUID(),
        teilId,
        outfitId,
        datum,
        angelegtAm: jetzt,
        zuletztGeaendert: jetzt,
      })
      .onConflictDoUpdate({
        target: [trageEintrag.teilId, trageEintrag.datum],
        set: { geloescht: false, outfitId, zuletztGeaendert: jetzt, syncOffen: true },
      })
      .run();

    if (plan.neuerWaeschestatus !== teil.waeschestatus) {
      tx.update(kleidungsstueck)
        .set({ waeschestatus: plan.neuerWaeschestatus, zuletztGeaendert: jetzt, syncOffen: true })
        .where(eq(kleidungsstueck.id, teilId))
        .run();
    }
    return plan;
  });
  if (plan && !plan.schonGetragen) notifyLocalChange();
  return plan;
}
