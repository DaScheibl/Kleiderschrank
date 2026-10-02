import { useColorScheme } from 'react-native';

import { colors, type ThemeColors } from './tokens';

export function useTheme(): { colors: ThemeColors; isDark: boolean } {
  const isDark = useColorScheme() === 'dark';
  return { colors: isDark ? colors.dark : colors.light, isDark };
}
