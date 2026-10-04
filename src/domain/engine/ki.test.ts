import { describe, expect, it } from 'vitest';

import { neuesKleidungsstueck } from '../kleidungsstueck/anlegen';
import type { Kategorie, Kleidungsstueck } from '../modell/typen';
import type { Kandidat } from './kandidaten';
import { kiEingabe, wendeKiAn } from './ki';

function teil(
  kategorie: Kategorie,
  name: string,
  unterart: Kleidungsstueck['unterart'] = null,
): Kleidungsstueck {
  const r = neuesKleidungsstueck(
    { name, kategorie, farbeHex: '#2F6FC0', farbeName: 'Blau', unterart },
    `${name}-id`,
    'z',
  );
  if (!r.ok) throw new Error();
  return r.teil;
}

function kandidat(nr: number): Kandidat {
  return {
    schluessel: `s${nr}`,
    oberteil: teil('oberteil', `Lieblingshemd von Oma ${nr}`, 'hemd'),
    hose: teil('hose', `Hose ${nr}`),
    jacke: null,
    schuhe: null,
    schmuck: [],
    score: 50 + nr,
    anteile: {} as Kandidat['anteile'],
    titel: `Regel ${nr}`,
    begruendung: `Regelbegründung ${nr}.`,
  };
}

const ks = [kandidat(1), kandidat(2), kandidat(3)];

describe('kiEingabe', () => {
  const e = kiEingabe(
    '2026-10-05',
    ks,
    {
      gefuehltMin: 8.4,
      gefuehltMax: 13.6,
      regenrisiko: 0.73,
      regenAb: '14:00',
      lage: 'regen',
      windKmh: 21.6,
    },
    { formalitaet: 2, ausTermin: true },
    ['clean'],
  );

  it('enthält keine Teilenamen – nur Art und Farbe', () => {
    const text = JSON.stringify(e);
    expect(text).not.toContain('Oma');
    expect(text).not.toContain('Lieblingshemd');
    expect(e.kandidaten[0]!.teile[0]).toMatchObject({
      rolle: 'oberteil',
      art: 'hemd',
      farbe: 'Blau',
    });
    expect(e.kandidaten[0]!.teile[1]!.art).toBe('hose');
  });

  it('nutzt neutrale IDs und gerundete Wetterwerte', () => {
    expect(e.kandidaten.map((k) => k.id)).toEqual(['k1', 'k2', 'k3']);
    expect(e.wetter).toMatchObject({
      gefuehltMin: 8,
      gefuehltMax: 14,
      regenrisiko: 0.7,
      windKmh: 22,
    });
    expect(e.anlass).toEqual({ formalitaet: 2, quelle: 'termin' });
  });

  it('gleiche Eingabe ergibt gleiche Prüfsumme, andere Kandidaten eine andere', () => {
    const a = kiEingabe('2026-10-05', ks, null, { formalitaet: 1, ausTermin: false }, []);
    const b = kiEingabe('2026-10-05', ks, null, { formalitaet: 1, ausTermin: false }, []);
    const c = kiEingabe(
      '2026-10-05',
      [ks[1]!, ks[0]!],
      null,
      { formalitaet: 1, ausTermin: false },
      [],
    );
    expect(a.bestandsPruefsumme).toBe(b.bestandsPruefsumme);
    expect(a.bestandsPruefsumme).not.toBe(c.bestandsPruefsumme);
  });
});

describe('wendeKiAn', () => {
  const antwort = {
    reihenfolge: [
      {
        id: 'k3',
        titel: 'Smart bei Regen',
        begruendung: 'Regen ab 14 Uhr, darum die Kombination.',
      },
      { id: 'k1', titel: '', begruendung: '' },
      { id: 'k99', titel: 'Erfunden', begruendung: 'Gibt es nicht.' },
      { id: 'k3', titel: 'Doppelt', begruendung: 'Doppelt.' },
    ],
    tipp: 'Schirm mitnehmen.',
  };

  it('sortiert um, übernimmt Texte, ignoriert Unbekanntes und Doppeltes, hängt Fehlendes an', () => {
    const r = wendeKiAn(ks, antwort, true);
    expect(r.map((k) => k.schluessel)).toEqual(['s3', 's1', 's2']);
    expect(r[0]!.titel).toBe('Smart bei Regen');
    expect(r[1]!.titel).toBe('Regel 1'); // leer → Textbaustein bleibt
    expect(r[2]!.begruendung).toBe('Regelbegründung 2.');
    expect(r).toHaveLength(3);
  });

  it('ohne Umsortieren bleiben Reihenfolge und Teile, nur Texte ändern sich', () => {
    const r = wendeKiAn(ks, antwort, false);
    expect(r.map((k) => k.schluessel)).toEqual(['s1', 's2', 's3']);
    expect(r[2]!.titel).toBe('Smart bei Regen');
  });
});
