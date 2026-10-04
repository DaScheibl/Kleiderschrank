import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { getDb } from '@/data/db/client';
import {
  einstellungen,
  groessenprofil,
  kleidungsstueck,
  outfit,
  outfitTeil,
  stilprofil,
  trageEintrag,
  waescheschwelle,
} from '@/data/db/schema';
import { lokalesDatum } from '@/domain/zeit';

import { getSyncState } from './sync/sync-service';

/**
 * Datenexport (DSGVO Art. 15/20): alle Daten des Schranks als JSON über das Teilen-Menü.
 * Quelle ist die lokale Datenbank – sie ist die Wahrheit und enthält auch nicht
 * synchronisierte Änderungen.
 */
export async function exportData(): Promise<void> {
  const db = getDb();
  const daten = {
    format: 'kleidungsschrank-export',
    version: 1,
    exportiertAm: new Date().toISOString(),
    kontoId: getSyncState().kontoId,
    kleidungsstuecke: db.select().from(kleidungsstueck).all(),
    outfits: db.select().from(outfit).all(),
    outfitTeile: db.select().from(outfitTeil).all(),
    trageEintraege: db.select().from(trageEintrag).all(),
    waescheschwellen: db.select().from(waescheschwelle).all(),
    groessenprofil: db.select().from(groessenprofil).all(),
    stilprofil: db.select().from(stilprofil).all(),
    einstellungen: db.select().from(einstellungen).all(),
  };

  const datei = new File(Paths.cache, `kleidungsschrank-export-${lokalesDatum(new Date())}.json`);
  if (datei.exists) datei.delete();
  datei.create();
  datei.write(JSON.stringify(daten, null, 2));

  await Sharing.shareAsync(datei.uri, {
    mimeType: 'application/json',
    UTI: 'public.json',
    dialogTitle: 'Daten exportieren',
  });
}
