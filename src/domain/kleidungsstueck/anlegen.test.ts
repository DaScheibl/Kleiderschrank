import { describe, expect, it } from 'vitest';

import { neuesKleidungsstueck } from './anlegen';

const ID = '00000000-0000-4000-8000-000000000001';
const JETZT = '2026-10-02T07:00:00.000Z';

describe('neuesKleidungsstueck', () => {
  it('setzt Standardwerte für ein frisches, sauberes, aktives Teil', () => {
    const ergebnis = neuesKleidungsstueck(
      { name: '  Weißes Hemd ', kategorie: 'oberteil', farbeHex: '#f7f7f5', farbeName: 'Weiß' },
      ID,
      JETZT,
    );
    expect(ergebnis.ok).toBe(true);
    if (!ergebnis.ok) return;
    expect(ergebnis.teil).toMatchObject({
      id: ID,
      name: 'Weißes Hemd',
      farbeHex: '#F7F7F5',
      waeschestatus: 'sauber',
      status: 'aktiv',
      geloescht: false,
      groesseQuelle: null,
      metallton: null,
      angelegtAm: JETZT,
      zuletztGeaendert: JETZT,
    });
  });

  it('gibt Schmuck einen Metallton', () => {
    const ergebnis = neuesKleidungsstueck(
      { name: 'Kette', kategorie: 'schmuck', farbeHex: '#D8C8A8', farbeName: 'Beige' },
      ID,
      JETZT,
    );
    expect(ergebnis.ok && ergebnis.teil.metallton).toBe('keins');
  });

  it('lehnt leeren Namen ab', () => {
    const ergebnis = neuesKleidungsstueck(
      { name: '   ', kategorie: 'hose', farbeHex: '#1C1C1C', farbeName: 'Schwarz' },
      ID,
      JETZT,
    );
    expect(ergebnis).toEqual({ ok: false, fehler: 'name_leer' });
  });

  it('lehnt ungültige Farbe ab', () => {
    const ergebnis = neuesKleidungsstueck(
      { name: 'Hose', kategorie: 'hose', farbeHex: 'schwarz', farbeName: 'Schwarz' },
      ID,
      JETZT,
    );
    expect(ergebnis).toEqual({ ok: false, fehler: 'farbe_ungueltig' });
  });

  it('lehnt eine Unterart aus einer anderen Kategorie ab', () => {
    const ergebnis = neuesKleidungsstueck(
      {
        name: 'Hose',
        kategorie: 'hose',
        farbeHex: '#1C1C1C',
        farbeName: 'Schwarz',
        unterart: 'kette',
      },
      ID,
      JETZT,
    );
    expect(ergebnis).toEqual({ ok: false, fehler: 'unterart_passt_nicht' });
  });
});
