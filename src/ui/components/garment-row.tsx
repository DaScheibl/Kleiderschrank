import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { KATEGORIE_NAMEN } from '@/domain/modell/konstanten';
import type { Kleidungsstueck } from '@/domain/modell/typen';

import { fontSize, fontWeight, radius, spacing } from '../theme/tokens';
import { useTheme } from '../theme/use-theme';

interface GarmentRowProps {
  teil: Kleidungsstueck;
  onPress?: () => void;
  action?: ReactNode;
}

export function GarmentRow({ teil, onPress, action }: GarmentRowProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={[styles.row, { backgroundColor: colors.surfaceRaised, borderColor: colors.border }]}>
      <View
        style={[styles.swatch, { backgroundColor: teil.farbeHex, borderColor: colors.border }]}
      />
      <View style={styles.text}>
        <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
          {teil.name}
        </Text>
        <Text style={{ color: colors.textMuted, fontSize: fontSize.caption }}>
          {KATEGORIE_NAMEN[teil.kategorie]}
        </Text>
      </View>
      {action}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  swatch: { width: 40, height: 40, borderRadius: radius.sm, borderWidth: StyleSheet.hairlineWidth },
  text: { flex: 1, gap: 2 },
  name: { fontSize: fontSize.body, fontWeight: fontWeight.semibold },
});
