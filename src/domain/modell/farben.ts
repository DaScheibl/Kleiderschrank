export interface Grundfarbe {
  name: string;
  hex: string;
  /** Neutrale Farben gelten in der Farbharmonie als Freibrief (B1). */
  neutral: boolean;
}

export const GRUNDFARBEN: readonly Grundfarbe[] = [
  { name: 'Schwarz', hex: '#1C1C1C', neutral: true },
  { name: 'Weiß', hex: '#F7F7F5', neutral: true },
  { name: 'Grau', hex: '#8E8E8E', neutral: true },
  { name: 'Beige', hex: '#D8C8A8', neutral: true },
  { name: 'Marine', hex: '#1F2F4F', neutral: true },
  { name: 'Denim', hex: '#4A6A8F', neutral: true },
  { name: 'Braun', hex: '#6B4A32', neutral: false },
  { name: 'Rot', hex: '#B3262E', neutral: false },
  { name: 'Orange', hex: '#E07A2E', neutral: false },
  { name: 'Gelb', hex: '#E8C547', neutral: false },
  { name: 'Grün', hex: '#3E7D4E', neutral: false },
  { name: 'Oliv', hex: '#6B6B3A', neutral: false },
  { name: 'Blau', hex: '#2F6FC0', neutral: false },
  { name: 'Lila', hex: '#6E4A9E', neutral: false },
  { name: 'Rosa', hex: '#E8A3B5', neutral: false },
] as const;

export function istGueltigerHex(hex: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(hex);
}
