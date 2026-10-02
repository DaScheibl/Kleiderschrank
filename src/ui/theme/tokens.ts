// Einzige Stelle für Farbwerte, Abstände, Schriftgrößen und Radien.
// Komponenten lesen Farben ausschließlich über useTheme().

const palette = {
  sand50: '#FBFAF7',
  sand100: '#F4F1EC',
  sand200: '#E7E2D9',
  sand300: '#D3CCBF',
  stone500: '#7A746A',
  stone700: '#4A453E',
  ink900: '#1E1C19',
  night950: '#121110',
  night900: '#1B1A18',
  night800: '#262422',
  night700: '#34312E',
  night500: '#8C867C',
  night200: '#E6E1D8',
  moss500: '#4F7A5A',
  moss300: '#8DB596',
  clay500: '#B4533A',
  clay300: '#E08B73',
  amber500: '#C98A1E',
  amber300: '#E8B85C',
} as const;

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceRaised: string;
  border: string;
  text: string;
  textMuted: string;
  accent: string;
  accentText: string;
  danger: string;
  warning: string;
}

export const colors: { light: ThemeColors; dark: ThemeColors } = {
  light: {
    background: palette.sand100,
    surface: palette.sand50,
    surfaceRaised: '#FFFFFF',
    border: palette.sand200,
    text: palette.ink900,
    textMuted: palette.stone500,
    accent: palette.moss500,
    accentText: '#FFFFFF',
    danger: palette.clay500,
    warning: palette.amber500,
  },
  dark: {
    background: palette.night950,
    surface: palette.night900,
    surfaceRaised: palette.night800,
    border: palette.night700,
    text: palette.night200,
    textMuted: palette.night500,
    accent: palette.moss300,
    accentText: palette.night950,
    danger: palette.clay300,
    warning: palette.amber300,
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const fontSize = {
  caption: 12,
  body: 15,
  bodyLarge: 17,
  title: 22,
  headline: 28,
} as const;

export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

export const radius = {
  sm: 6,
  md: 10,
  lg: 16,
  pill: 999,
} as const;
