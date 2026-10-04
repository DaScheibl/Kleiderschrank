import { describe, expect, it } from 'vitest';

import { neuesKleidungsstueck } from '../kleidungsstueck/anlegen';
import type { Kategorie, Kleidungsstueck, TrageEintrag } from '../modell/typen';
import {
  effektiveSchwelle,
  istKurzVorSchwelle,
  istVerfuegbar,
  planeTragen,
  setzeWaeschestatus,
  tragestatistik,
} from './waescheregel';

function teil(kategorie: Kategorie, extra: Partial<Kleidungsstueck> = {}): Kleidungsstueck {
  const r = neuesKleidungsstueck(
    { name: 'Teil', kategorie, farbeHex: '#1C1C1C', farbeName: 'Schwarz' },
    'teil-1',
    '2026-10-01T08:00:00.000Z',
  );
  if (!r.ok) throw new Error('Testteil ungültig');
  return { ...r.teil, ...extra };
}

let zaehler = 0;
function eintrag(
  datum: string,
  angelegtAm: string,
  extra: Partial<TrageEintrag> = {},
): TrageEintrag {
  zaehler++;
  return {
    id: `e-${zaehler}`,
    teilId: 'teil-1',
    outfitId: null,
    datum,
    angelegtAm,
    zuletztGeaendert: angelegtAm,
    geloescht: false,
    ...extra,
  };
}

describe('effektiveSchwelle', () => {
  it('nimmt den Standard der Kategorie', () => {
    expect(effektiveSchwelle(teil('oberteil'), {})).toBe(1);
    expect(effektiveSchwelle(teil('hose'), {})).toBe(4);
    expect(effektiveSchwelle(teil('schmuck'), {})).toBe(0);
  });
  it('die Einstellung der Kategorie schlägt den Standard', () => {
    expect(effektiveSchwelle(teil('hose'), { hose: 6 })).toBe(6);
  });
  it('die eigene Schwelle des Teils schlägt die Kategorie', () => {
    expect(effektiveSchwelle(teil('hose', { waescheschwelleEigen: 2 }), { hose: 6 })).toBe(2);
  });
  it('eine eigene Schwelle 0 gilt und wird nicht als "leer" übergangen', () => {
    expect(effektiveSchwelle(teil('oberteil', { waescheschwelleEigen: 0 }), {})).toBe(0);
  });
});

describe('tragestatistik', () => {
  it('zählt gesamt, seit der Wäsche und den letzten Tag', () => {
    const t = teil('hose', { gewaschenAm: '2026-10-03T18:00:00.000Z' });
    const s = tragestatistik(t, [
      eintrag('2026-10-02', '2026-10-02T07:00:00.000Z'),
      eintrag('2026-10-03', '2026-10-03T07:00:00.000Z'),
      eintrag('2026-10-04', '2026-10-04T07:00:00.000Z'),
    ]);
    expect(s).toEqual({ getragenGesamt: 3, getragenSeitWaesche: 1, zuletztGetragen: '2026-10-04' });
  });
  it('ignoriert gelöschte Einträge und fremde Teile', () => {
    const s = tragestatistik(teil('hose'), [
      eintrag('2026-10-02', '2026-10-02T07:00:00.000Z', { geloescht: true }),
      eintrag('2026-10-03', '2026-10-03T07:00:00.000Z', { teilId: 'anderes' }),
    ]);
    expect(s).toEqual({ getragenGesamt: 0, getragenSeitWaesche: 0, zuletztGetragen: null });
  });
});

describe('planeTragen', () => {
  it('Oberteil (Schwelle 1) wandert nach einmal Tragen in den Korb', () => {
    expect(planeTragen(teil('oberteil'), '2026-10-04', [], {})).toEqual({
      schonGetragen: false,
      neuerWaeschestatus: 'korb',
    });
  });
  it('Hose (Schwelle 4) bleibt bis zum vierten Tragen sauber', () => {
    const t = teil('hose');
    const bisher = [
      eintrag('2026-10-01', '2026-10-01T07:00:00.000Z'),
      eintrag('2026-10-02', '2026-10-02T07:00:00.000Z'),
    ];
    expect(planeTragen(t, '2026-10-03', bisher, {}).neuerWaeschestatus).toBe('sauber');
    bisher.push(eintrag('2026-10-03', '2026-10-03T07:00:00.000Z'));
    expect(planeTragen(t, '2026-10-04', bisher, {}).neuerWaeschestatus).toBe('korb');
  });
  it('Schmuck (Schwelle 0) kommt nie in den Korb', () => {
    const bisher = Array.from({ length: 50 }, (_, i) =>
      eintrag(
        `2026-08-${String((i % 28) + 1).padStart(2, '0')}`,
        `2026-08-01T0${i % 9}:00:00.000Z`,
      ),
    );
    expect(planeTragen(teil('schmuck'), '2026-10-04', bisher, {}).neuerWaeschestatus).toBe(
      'sauber',
    );
  });
  it('zweimal am selben Tag zählt nur einmal', () => {
    const plan = planeTragen(
      teil('hose'),
      '2026-10-04',
      [eintrag('2026-10-04', '2026-10-04T07:00:00.000Z')],
      {},
    );
    expect(plan.schonGetragen).toBe(true);
  });
  it('zählt nach der Wäsche wieder von vorn', () => {
    const t = teil('hose', { gewaschenAm: '2026-10-03T20:00:00.000Z' });
    const bisher = [1, 2, 3].map((d) => eintrag(`2026-10-0${d}`, `2026-10-0${d}T07:00:00.000Z`));
    expect(planeTragen(t, '2026-10-04', bisher, {}).neuerWaeschestatus).toBe('sauber');
  });
});

describe('setzeWaeschestatus', () => {
  const jetzt = '2026-10-04T19:00:00.000Z';
  it('sauber setzt gewaschenAm', () => {
    expect(
      setzeWaeschestatus(teil('hose', { waeschestatus: 'maschine' }), 'sauber', jetzt),
    ).toEqual({ waeschestatus: 'sauber', gewaschenAm: jetzt });
  });
  it('sauber auf ein sauberes Teil ändert gewaschenAm nicht', () => {
    expect(setzeWaeschestatus(teil('hose'), 'sauber', jetzt).gewaschenAm).toBeNull();
  });
  it('in den Korb lässt gewaschenAm stehen', () => {
    const t = teil('hose', { gewaschenAm: '2026-10-01T00:00:00.000Z' });
    expect(setzeWaeschestatus(t, 'korb', jetzt)).toEqual({
      waeschestatus: 'korb',
      gewaschenAm: '2026-10-01T00:00:00.000Z',
    });
  });
});

describe('istVerfuegbar und istKurzVorSchwelle', () => {
  it('nur aktive, saubere, nicht gelöschte Teile sind verfügbar', () => {
    expect(istVerfuegbar(teil('hose'))).toBe(true);
    expect(istVerfuegbar(teil('hose', { waeschestatus: 'korb' }))).toBe(false);
    expect(istVerfuegbar(teil('hose', { waeschestatus: 'maschine' }))).toBe(false);
    expect(istVerfuegbar(teil('hose', { status: 'aussortiert' }))).toBe(false);
    expect(istVerfuegbar(teil('hose', { geloescht: true }))).toBe(false);
  });
  it('kurz vor der Schwelle ist das vorletzte Tragen', () => {
    expect(istKurzVorSchwelle(3, 4)).toBe(true);
    expect(istKurzVorSchwelle(2, 4)).toBe(false);
    expect(istKurzVorSchwelle(0, 1)).toBe(false);
    expect(istKurzVorSchwelle(0, 0)).toBe(false);
  });
});
