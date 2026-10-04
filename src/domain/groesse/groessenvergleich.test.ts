import { describe, expect, it } from 'vitest';

import { neuesKleidungsstueck } from '../kleidungsstueck/anlegen';
import type { Groessenprofil, Kategorie, Kleidungsstueck } from '../modell/typen';
import { abweichungZumProfil, passtNichtLautGroesse, stufe } from './groessenvergleich';

function teil(kategorie: Kategorie, extra: Partial<Kleidungsstueck>): Kleidungsstueck {
  const r = neuesKleidungsstueck(
    { name: 'T', kategorie, farbeHex: '#1C1C1C', farbeName: 'Schwarz' },
    'x',
    'z',
  );
  if (!r.ok) throw new Error();
  return { ...r.teil, ...extra };
}

const zeit = { angelegtAm: 'z', zuletztGeaendert: 'z', geloescht: false };
const profil: Groessenprofil[] = [
  { bereich: 'oberteil', system: 'alpha', werte: ['M', 'L'], ...zeit },
  { bereich: 'hose', system: 'weite_laenge', werte: ['32/32'], ...zeit },
  { bereich: 'schuhe', system: 'schuh_eu', werte: ['43'], ...zeit },
];

describe('stufe', () => {
  it('liest die gängigen Systeme', () => {
    expect(stufe('alpha', 'm')).toBe(3);
    expect(stufe('alpha', '2XL')).toBe(6);
    expect(stufe('eu_konfektion', '50')).toBe(25);
    expect(stufe('weite_laenge', '34/32')).toBe(17);
    expect(stufe('schuh_eu', '42,5')).toBe(42.5);
    expect(stufe('alpha', 'riesig')).toBeNull();
  });
});

describe('passtNichtLautGroesse', () => {
  it('eine Stufe Abweichung ist noch in Ordnung, zwei nicht', () => {
    const xl = teil('oberteil', {
      groesseSystem: 'alpha',
      groesseNormiert: 'XL',
      groesseQuelle: 'etikett',
    });
    const xxl = teil('oberteil', {
      groesseSystem: 'alpha',
      groesseNormiert: 'XXL',
      groesseQuelle: 'hand',
    });
    const xs = teil('oberteil', {
      groesseSystem: 'alpha',
      groesseNormiert: 'XS',
      groesseQuelle: 'hand',
    });
    expect(passtNichtLautGroesse(xl, profil)).toBe(false); // 1 Stufe zu L
    expect(passtNichtLautGroesse(xxl, profil)).toBe(true); // 2 Stufen zu L
    expect(passtNichtLautGroesse(xs, profil)).toBe(true);
  });

  it('eine geschätzte Größe zählt nie', () => {
    const geschaetzt = teil('oberteil', {
      groesseSystem: 'alpha',
      groesseNormiert: 'XXXL',
      groesseQuelle: 'geschaetzt',
    });
    expect(abweichungZumProfil(geschaetzt, profil)).toBeNull();
    expect(passtNichtLautGroesse(geschaetzt, profil)).toBe(false);
  });

  it('ohne Größe oder bei anderem System kein Urteil', () => {
    expect(passtNichtLautGroesse(teil('oberteil', {}), profil)).toBe(false);
    const konf = teil('oberteil', {
      groesseSystem: 'eu_konfektion',
      groesseNormiert: '58',
      groesseQuelle: 'hand',
    });
    expect(passtNichtLautGroesse(konf, profil)).toBe(false);
  });

  it('Hosen über die Bundweite, Schuhe über die EU-Größe', () => {
    const hose = teil('hose', {
      groesseSystem: 'weite_laenge',
      groesseNormiert: '36/32',
      groesseQuelle: 'etikett',
    });
    const schuh = teil('schuhe', {
      groesseSystem: 'schuh_eu',
      groesseNormiert: '44',
      groesseQuelle: 'etikett',
    });
    expect(passtNichtLautGroesse(hose, profil)).toBe(true); // 4 Zoll = 2 Stufen
    expect(passtNichtLautGroesse(schuh, profil)).toBe(false);
  });

  it('Schmuck hat keinen Größenbereich', () => {
    const ring = teil('schmuck', {
      groesseSystem: 'alpha',
      groesseNormiert: 'XXXL',
      groesseQuelle: 'hand',
    });
    expect(passtNichtLautGroesse(ring, profil)).toBe(false);
  });
});
