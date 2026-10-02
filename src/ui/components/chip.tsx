import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../theme/use-theme';
import { fontSize, radius, spacing } from '../theme/tokens';

interface ChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  /** Farbmuster vor dem Text, z. B. bei der Farbwahl */
  swatch?: string;
}

export function Chip({ label, selected, onPress, swatch }: ChipProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        styles.chip,
        {
          borderColor: selected ? colors.accent : colors.border,
          backgroundColor: selected ? colors.surfaceRaised : colors.surface,
        },
      ]}>
      {swatch ? (
        <View style={[styles.swatch, { backgroundColor: swatch, borderColor: colors.border }]} />
      ) : null}
      <Text style={{ color: colors.text, fontSize: fontSize.body }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1.5,
  },
  swatch: {
    width: 14,
    height: 14,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
