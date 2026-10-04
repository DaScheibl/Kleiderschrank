import { Pressable, StyleSheet, Text, View } from 'react-native';

import { setThreshold } from '@/data/repositories/profile-repository';
import { KATEGORIE_NAMEN, STANDARD_SCHWELLEN } from '@/domain/modell/konstanten';
import { KATEGORIEN } from '@/domain/modell/typen';
import { useThresholds } from '@/hooks/use-garments';
import { Placeholder, Screen } from '@/ui/components/screen';
import { fontSize, fontWeight, radius, spacing } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/use-theme';

const MAXIMUM = 99;

export default function WaescheschwellenScreen() {
  const { colors } = useTheme();
  const schwellen = useThresholds();

  return (
    <Screen>
      <Placeholder text="Nach wie vielen Tragetagen ein Teil in den Wäschekorb wandert. 0 heißt: wird nie gewaschen." />
      {KATEGORIEN.map((kategorie) => {
        const wert = schwellen[kategorie] ?? STANDARD_SCHWELLEN[kategorie];
        return (
          <View
            key={kategorie}
            style={[
              styles.zeile,
              { backgroundColor: colors.surfaceRaised, borderColor: colors.border },
            ]}>
            <View style={styles.text}>
              <Text style={[styles.name, { color: colors.text }]}>
                {KATEGORIE_NAMEN[kategorie]}
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: fontSize.caption }}>
                {wert === 0 ? 'nie waschen' : `nach ${wert}× tragen`}
                {wert !== STANDARD_SCHWELLEN[kategorie]
                  ? ` · Standard ${STANDARD_SCHWELLEN[kategorie]}`
                  : ''}
              </Text>
            </View>
            <Stepper
              label={`${KATEGORIE_NAMEN[kategorie]} verringern`}
              zeichen="−"
              disabled={wert <= 0}
              onPress={() => setThreshold(kategorie, wert - 1)}
            />
            <Text style={[styles.wert, { color: colors.text }]}>{wert}</Text>
            <Stepper
              label={`${KATEGORIE_NAMEN[kategorie]} erhöhen`}
              zeichen="+"
              disabled={wert >= MAXIMUM}
              onPress={() => setThreshold(kategorie, wert + 1)}
            />
          </View>
        );
      })}
    </Screen>
  );
}

interface StepperProps {
  label: string;
  zeichen: string;
  disabled: boolean;
  onPress: () => void;
}

function Stepper({ label, zeichen, disabled, onPress }: StepperProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      hitSlop={8}
      style={[styles.stepper, { borderColor: colors.border, opacity: disabled ? 0.3 : 1 }]}>
      <Text style={{ color: colors.accent, fontSize: fontSize.title }}>{zeichen}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  zeile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  text: { flex: 1, gap: 2 },
  name: { fontSize: fontSize.body, fontWeight: fontWeight.semibold },
  wert: {
    minWidth: 28,
    textAlign: 'center',
    fontSize: fontSize.bodyLarge,
    fontWeight: fontWeight.bold,
  },
  stepper: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
