import { describe, expect, it } from 'vitest';

import { GRUNDFARBEN } from '../modell/farben';
import { farbfamilie, farbtonAbstand, harmonieren, hexZuHsb, istNeutral } from './farbharmonie';

const farbe = (name: string) => {
  const f = GRUNDFARBEN.find((g) => g.name === name)!;
  return { hex: f.hex, name: f.name };
};

describe('hexZuHsb', () => {
  it('rechnet Grundfarben richtig um', () => {
    expect(hexZuHsb('#FF0000')).toEqual({ h: 0, s: 1, b: 1 });
    expect(hexZuHsb('#00FF00').h).toBe(120);
    expect(hexZuHsb('#0000FF').h).toBe(240);
    expect(hexZuHsb('#808080').s).toBe(0);
  });
});

describe('istNeutral', () => {
  it('alle als neutral markierten Grundfarben werden auch per HSB erkannt', () => {
    for (const g of GRUNDFARBEN) expect(istNeutral(g.hex)).toBe(g.neutral);
  });
  it('erkennt Neutrale auch am Namen', () => {
    expect(istNeutral('#123456', 'Marine')).toBe(true);
  });
});

describe('harmonieren', () => {
  it('neutral passt zu allem', () => {
    expect(harmonieren(farbe('Rot'), farbe('Schwarz'))).toBe(true);
    expect(harmonieren(farbe('Gelb'), farbe('Denim'))).toBe(true);
  });
  it('gleiche Familie passt', () => {
    expect(harmonieren({ hex: '#2F6FC0' }, { hex: '#3A5FCD' })).toBe(true);
  });
  it('Komplementärfarben passen', () => {
    expect(harmonieren(farbe('Blau'), farbe('Orange'))).toBe(true);
  });
  it('Rot und Grün im 120°-Abstand passen nicht', () => {
    expect(harmonieren({ hex: '#B3262E' }, { hex: '#3E7D4E' })).toBe(false);
  });
});

describe('farbtonAbstand und farbfamilie', () => {
  it('Abstand über die 0°-Grenze', () => {
    expect(farbtonAbstand(350, 10)).toBe(20);
  });
  it('ordnet Familien zu', () => {
    expect(farbfamilie(farbe('Marine').hex)).toBe('neutral');
    expect(farbfamilie(farbe('Rot').hex)).toBe('rot');
    expect(farbfamilie(farbe('Blau').hex)).toBe('blau');
    expect(farbfamilie(farbe('Grün').hex)).toBe('gruen');
  });
});
