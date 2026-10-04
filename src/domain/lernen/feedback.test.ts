import { describe, expect, it } from 'vitest';

import { neuesKleidungsstueck } from '../kleidungsstueck/anlegen';
import type { Kleidungsstueck } from '../modell/typen';
import { feedbackWert, lerneAusFeedback, type OutfitHistorie } from './feedback';

function teil(id: string, hex: string, name: string): Kleidungsstueck {
  const r = neuesKleidungsstueck(
    { name, kategorie: 'oberteil', farbeHex: hex, farbeName: name },
    id,
    'z',
  );
  if (!r.ok) throw new Error();
  return r.teil;
}

const blau = teil('blau', '#2F6FC0', 'Blau');
const beige = teil('beige', '#D8C8A8', 'Beige');
const rot = teil('rot', '#B3262E', 'Rot');
const map = new Map([blau, beige, rot].map((t) => [t.id, t]));

const o = (
  datum: string,
  teile: Kleidungsstueck[],
  bewertung: OutfitHistorie['bewertung'],
  getragen = false,
): OutfitHistorie => ({
  datum,
  kombinationsSchluessel: teile.map((t) => t.id).join('+'),
  bewertung,
  getragen,
  teilIds: teile.map((t) => t.id),
});

describe('lerneAusFeedback', () => {
  it('gemocht positiv, abgelehnt negativ, offen zählt nicht', () => {
    const f = lerneAusFeedback(
      [
        o('2026-10-04', [blau, beige], 'gefaellt'),
        o('2026-10-04', [rot, beige], 'abgelehnt'),
        o('2026-10-04', [blau], 'offen'),
      ],
      map,
      '2026-10-05',
    );
    expect(f.teile.get('blau')).toBeGreaterThan(0);
    expect(f.teile.get('rot')).toBeLessThan(0);
    expect(f.teile.get('beige')).toBeCloseTo(0, 5);
    expect(f.farbpaare.get('blau|neutral')).toBeGreaterThan(0);
  });

  it('getragen zählt als Zustimmung, auch wenn vorher nach links gewischt', () => {
    const f = lerneAusFeedback([o('2026-10-04', [rot], 'abgelehnt', true)], map, '2026-10-05');
    expect(f.teile.get('rot')).toBeGreaterThan(0);
  });

  it('ältere Bewertungen zählen weniger', () => {
    const f = lerneAusFeedback(
      [o('2026-07-01', [rot], 'gefaellt'), o('2026-10-04', [rot], 'abgelehnt')],
      map,
      '2026-10-05',
    );
    expect(f.teile.get('rot')).toBeLessThan(0);
  });

  it('feedbackWert liegt zwischen −1 und 1, ohne Daten 0', () => {
    const f = lerneAusFeedback([o('2026-10-04', [blau, beige], 'gefaellt')], map, '2026-10-05');
    const w = feedbackWert(f, [blau, beige], 'blau+beige');
    expect(w).toBeGreaterThan(0);
    expect(w).toBeLessThanOrEqual(1);
    expect(feedbackWert(lerneAusFeedback([], map, '2026-10-05'), [rot], 'x')).toBe(0);
  });
});
