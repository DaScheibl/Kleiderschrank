import type { Uuid } from '../modell/typen';

/** FNV-1a, 32 Bit – kurz, schnell und auf allen Geräten gleich. */
export function hash(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

/** Gleiche Teile ergeben unabhängig von der Reihenfolge denselben Schlüssel. */
export function kombinationsSchluessel(teilIds: readonly Uuid[]): string {
  return hash([...teilIds].sort().join('|'));
}

/** Pseudozufall 0–1 aus einem Text – gleicher Text, gleiches Ergebnis. Für Gleichstände. */
export function zufallAus(text: string): number {
  return parseInt(hash(text), 16) / 0xffffffff;
}
