import { describe, expect, it } from 'vitest';

import {
  gefuehlteTemperatur,
  lageAusSymbol,
  regenrisikoDerStunde,
  tageswetter,
  zielWaermegrad,
  type WetterStunde,
} from './wetter';

/** Stunde in lokaler Zeit des Testrechners, damit der Test in jeder Zeitzone gilt. */
function stunde(tag: number, h: number, extra: Partial<WetterStunde> = {}): WetterStunde {
  return {
    zeit: new Date(2026, 9, tag, h, 0).toISOString(),
    temperatur: 15,
    gefuehlt: 14,
    windMs: 3,
    feuchte: 60,
    niederschlagMm: 0,
    wahrscheinlichkeit: null,
    symbol: 'partlycloudy_day',
    ...extra,
  };
}

describe('gefuehlteTemperatur (Steadman)', () => {
  it('bei Windstille und mittlerer Feuchte knapp unter der gemessenen', () => {
    expect(gefuehlteTemperatur(20, 0, 50)).toBeCloseTo(19.85, 1);
  });
  it('Wind macht es deutlich kälter', () => {
    expect(gefuehlteTemperatur(5, 10, 80)).toBeCloseTo(-3.7, 1);
  });
  it('schwüle Hitze fühlt sich wärmer an', () => {
    expect(gefuehlteTemperatur(30, 1, 80)).toBeGreaterThan(33);
  });
});

describe('regenrisikoDerStunde', () => {
  it('nimmt die gelieferte Wahrscheinlichkeit', () => {
    expect(regenrisikoDerStunde(stunde(4, 12, { wahrscheinlichkeit: 35 }))).toEqual({
      risiko: 0.35,
      geschaetzt: false,
    });
  });
  it('schätzt aus der Menge, wenn keine Wahrscheinlichkeit kommt', () => {
    expect(regenrisikoDerStunde(stunde(4, 12, { niederschlagMm: 1.2 })).risiko).toBe(0.9);
    expect(regenrisikoDerStunde(stunde(4, 12, { niederschlagMm: 0.1 })).risiko).toBe(0.5);
    expect(regenrisikoDerStunde(stunde(4, 12, { symbol: 'lightrainshowers_day' })).risiko).toBe(
      0.4,
    );
    expect(regenrisikoDerStunde(stunde(4, 12)).risiko).toBe(0);
  });
});

describe('lageAusSymbol', () => {
  it('erkennt die MET-Symbole', () => {
    expect(lageAusSymbol('heavyrainandthunder')).toBe('gewitter');
    expect(lageAusSymbol('lightsnowshowers_night')).toBe('schnee');
    expect(lageAusSymbol('sleet')).toBe('schneeregen');
    expect(lageAusSymbol('rainshowers_day')).toBe('regen');
    expect(lageAusSymbol('fog')).toBe('nebel');
    expect(lageAusSymbol('partlycloudy_day')).toBe('heiter');
    expect(lageAusSymbol('cloudy')).toBe('bewoelkt');
    expect(lageAusSymbol('clearsky_day')).toBe('sonnig');
  });
});

describe('tageswetter', () => {
  const stunden = [
    stunde(4, 6, { gefuehlt: 2 }), // vor 7 Uhr – zählt nicht
    stunde(4, 8, { gefuehlt: 6 }),
    stunde(4, 11, { gefuehlt: 11, windMs: 8 }),
    stunde(4, 14, { gefuehlt: 13, niederschlagMm: 0.6, symbol: 'rain' }),
    stunde(4, 17, { gefuehlt: 9, niederschlagMm: 1.5, symbol: 'heavyrain' }),
    stunde(4, 23, { gefuehlt: 1 }), // nach 22 Uhr – zählt nicht
    stunde(5, 9, { gefuehlt: 20 }),
  ];

  it('fasst den heutigen Tag mit gefühlter Temperatur, Regen ab und Wind zusammen', () => {
    const tag = tageswetter(stunden, new Date(2026, 9, 4, 7, 30))!;
    expect(tag).toMatchObject({
      datum: '2026-10-04',
      fuerMorgen: false,
      gefuehltMin: 6,
      gefuehltMax: 13,
      regenrisiko: 0.9,
      regenGeschaetzt: true,
      regenAb: '14:00',
      windMaxKmh: 29,
      lage: 'regen',
    });
    expect(tag.verlauf.map((v) => v.uhrzeit)).toEqual(['08:00', '11:00', '14:00', '17:00']);
  });

  it('ignoriert schon vergangene Stunden', () => {
    const tag = tageswetter(stunden, new Date(2026, 9, 4, 15, 10))!;
    expect(tag.gefuehltMin).toBe(9);
    expect(tag.verlauf.map((v) => v.uhrzeit)).toEqual(['17:00']);
  });

  it('nach 22 Uhr gilt der nächste Tag', () => {
    const tag = tageswetter(stunden, new Date(2026, 9, 4, 22, 30))!;
    expect(tag).toMatchObject({ datum: '2026-10-05', fuerMorgen: true, gefuehltMax: 20 });
  });

  it('rechnet die gefühlte Temperatur selbst, wenn MET sie nicht liefert', () => {
    const tag = tageswetter(
      [stunde(4, 12, { gefuehlt: null, temperatur: 5, windMs: 10, feuchte: 80 })],
      new Date(2026, 9, 4, 8, 0),
    )!;
    expect(tag.gefuehltMin).toBeCloseTo(-3.7, 1);
  });

  it('ohne Daten gibt es keinen Tag', () => {
    expect(tageswetter([], new Date(2026, 9, 4, 8, 0))).toBeNull();
  });
});

describe('zielWaermegrad', () => {
  it('gewichtet zur kalten Tageszeit hin', () => {
    expect(zielWaermegrad({ gefuehltMin: 22, gefuehltMax: 28 })).toBe(0);
    expect(zielWaermegrad({ gefuehltMin: 12, gefuehltMax: 20 })).toBe(1);
    expect(zielWaermegrad({ gefuehltMin: 4, gefuehltMax: 14 })).toBe(2);
    expect(zielWaermegrad({ gefuehltMin: -5, gefuehltMax: 3 })).toBe(3);
  });
});
