import { Pressable, StyleSheet, Text } from 'react-native';

import { useTheme } from '../theme/use-theme';
import { fontSize, fontWeight, radius, spacing } from '../theme/tokens';

interface ButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
}

export function Button({ label, onPress, disabled = false, variant = 'primary' }: ButtonProps) {
  const { colors } = useTheme();
  const primary = variant === 'primary';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: primary ? colors.accent : colors.surfaceRaised,
          borderColor: primary ? colors.accent : colors.border,
          opacity: disabled ? 0.4 : pressed ? 0.8 : 1,
        },
      ]}>
      <Text style={[styles.label, { color: primary ? colors.accentText : colors.text }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  label: { fontSize: fontSize.bodyLarge, fontWeight: fontWeight.semibold },
});
