import type { Formalitaet, Kleidungsstueck, Metallton } from '../modell/typen';
import { zufallAus } from './determinismus';

/** Höchstens ein Teil je Unterart, zusammen höchstens drei. */
export const MAX_SCHMUCK = 3;

/** Wie viele Teile bei welcher Formalität – je feiner, desto mehr. */
function anzahl(formalitaet: Formalitaet, seed: string): number {
  if (formalitaet === 0) return zufallAus(`${seed}:schmuck`) < 0.5 ? 0 : 1;
  return Math.min(MAX_SCHMUCK, formalitaet);
}

const NEUTRALE_TOENE: readonly (Metallton | null)[] = ['gemischt', 'keins', null];

/**
 * Wählt Schmuck zu einem Outfit. Nie Pflicht; gleicher Metallton bevorzugt
 * ("gemischt" und "keins" passen zu jedem Ton). Deterministisch über `seed`.
 */
export function waehleSchmuck(
  verfuegbar: readonly Kleidungsstueck[],
  formalitaet: Formalitaet,
  seed: string,
): Kleidungsstueck[] {
  const soll = anzahl(formalitaet, seed);
  if (soll === 0 || verfuegbar.length === 0) return [];

  const gemischt = [...verfuegbar].sort(
    (a, b) => zufallAus(`${seed}:${a.id}`) - zufallAus(`${seed}:${b.id}`),
  );

  // Hauptton: der Ton mit den meisten Teilen, bei Gleichstand der erste in der Mischung.
  const zaehler = new Map<Metallton, number>();
  for (const t of gemischt) {
    if (t.metallton && !NEUTRALE_TOENE.includes(t.metallton)) {
      zaehler.set(t.metallton, (zaehler.get(t.metallton) ?? 0) + 1);
    }
  }
  const hauptton = [...zaehler.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const passt = (t: Kleidungsstueck) =>
    hauptton === null || t.metallton === hauptton || NEUTRALE_TOENE.includes(t.metallton);

  const auswahl: Kleidungsstueck[] = [];
  const unterarten = new Set<string>();
  for (const t of [...gemischt.filter(passt), ...gemischt.filter((t) => !passt(t))]) {
    if (auswahl.length >= soll) break;
    const art = t.unterart ?? 'sonstiges';
    if (unterarten.has(art)) continue;
    unterarten.add(art);
    auswahl.push(t);
  }
  return auswahl;
}
