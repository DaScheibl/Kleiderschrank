import type { LokalesDatum } from './modell/typen';

/** Kalendertag in der Zeitzone des Geräts. Bewusst nicht toISOString(): das wäre UTC. */
export function lokalesDatum(zeitpunkt: Date): LokalesDatum {
  const j = zeitpunkt.getFullYear();
  const m = String(zeitpunkt.getMonth() + 1).padStart(2, '0');
  const t = String(zeitpunkt.getDate()).padStart(2, '0');
  return `${j}-${m}-${t}`;
}
