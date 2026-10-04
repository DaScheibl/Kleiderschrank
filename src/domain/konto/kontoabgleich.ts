import type { Uuid } from '../modell/typen';

/**
 * Was zu tun ist, wenn die lokale Datenbank (gehört zu `lokalesKonto`) auf eine
 * Sitzung trifft (`sitzungsKonto`). Lokale Daten werden in keinem Fall gelöscht.
 */
export type KontoAbgleich =
  | { art: 'ohne_sitzung' }
  | { art: 'binden'; kontoId: Uuid }
  | { art: 'passt' }
  | { art: 'anderes_konto'; lokal: Uuid; sitzung: Uuid };

export function kontoAbgleich(
  lokalesKonto: Uuid | null,
  sitzungsKonto: Uuid | null,
): KontoAbgleich {
  if (sitzungsKonto === null) return { art: 'ohne_sitzung' };
  if (lokalesKonto === null) return { art: 'binden', kontoId: sitzungsKonto };
  if (lokalesKonto === sitzungsKonto) return { art: 'passt' };
  return { art: 'anderes_konto', lokal: lokalesKonto, sitzung: sitzungsKonto };
}

/** Synchronisiert wird nur, wenn der lokale Schrank eindeutig zur Sitzung gehört. */
export function darfSynchronisieren(abgleich: KontoAbgleich): boolean {
  return abgleich.art === 'passt' || abgleich.art === 'binden';
}
