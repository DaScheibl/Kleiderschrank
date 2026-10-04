/** Farbton 0–360, Sättigung und Helligkeit 0–1 */
export interface Hsb {
  h: number;
  s: number;
  b: number;
}

export function hexZuHsb(hex: string): Hsb {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const bl = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, bl);
  const min = Math.min(r, g, bl);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - bl) / d) % 6;
    else if (max === g) h = (bl - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s: max === 0 ? 0 : d / max, b: max };
}

const NEUTRALE_NAMEN = new Set([
  'schwarz',
  'weiß',
  'weiss',
  'grau',
  'beige',
  'marine',
  'denim',
  'creme',
  'anthrazit',
]);

/**
 * Neutrale Farben (Schwarz, Weiß, Grau, Beige, Marine, Denim) passen zu allem.
 * Erkannt am Namen oder – für frei erkannte Farben – am HSB-Wert.
 */
export function istNeutral(hex: string, name?: string | null): boolean {
  if (name && NEUTRALE_NAMEN.has(name.trim().toLowerCase())) return true;
  const { h, s, b } = hexZuHsb(hex);
  if (s < 0.15 || b < 0.2) return true; // Schwarz, Weiß, Grautöne
  if (h >= 200 && h <= 240 && b < 0.45) return true; // Marine
  if (h >= 200 && h <= 230 && s >= 0.25 && s <= 0.6 && b <= 0.7) return true; // Denim
  if (h >= 25 && h <= 50 && s < 0.35 && b > 0.6) return true; // Beige
  return false;
}

/** Abstand zweier Farbtöne auf dem Farbkreis, 0–180 */
export function farbtonAbstand(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

/** Gleiche Farbfamilie, Komplementärabstand oder eine neutrale Farbe als Freibrief. */
export function harmonieren(
  a: { hex: string; name?: string | null },
  b: { hex: string; name?: string | null },
): boolean {
  if (istNeutral(a.hex, a.name) || istNeutral(b.hex, b.name)) return true;
  const d = farbtonAbstand(hexZuHsb(a.hex).h, hexZuHsb(b.hex).h);
  return d <= 30 || (d >= 150 && d <= 210);
}

export type Farbfamilie =
  'neutral' | 'rot' | 'orange' | 'gelb' | 'gruen' | 'tuerkis' | 'blau' | 'lila' | 'pink';

/** Grobe Familie – für das Lernen aus Feedback, damit "Blau zu Beige" auch für neue Teile gilt. */
export function farbfamilie(hex: string, name?: string | null): Farbfamilie {
  if (istNeutral(hex, name)) return 'neutral';
  const { h } = hexZuHsb(hex);
  if (h < 15 || h >= 345) return 'rot';
  if (h < 40) return 'orange';
  if (h < 70) return 'gelb';
  if (h < 160) return 'gruen';
  if (h < 195) return 'tuerkis';
  if (h < 255) return 'blau';
  if (h < 290) return 'lila';
  return 'pink';
}
