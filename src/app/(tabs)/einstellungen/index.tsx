import Constants from 'expo-constants';
import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';

import { Placeholder, Screen } from '@/ui/components/screen';
import { fontSize, radius, spacing } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/use-theme';

export default function EinstellungenScreen() {
  const { colors } = useTheme();
  return (
    <Screen>
      <Link href="/einstellungen/waescheschwellen" asChild>
        <Pressable
          style={[
            styles.eintrag,
            { backgroundColor: colors.surfaceRaised, borderColor: colors.border },
          ]}>
          <Text style={{ color: colors.text, fontSize: fontSize.bodyLarge }}>Wäscheschwellen</Text>
          <Text style={{ color: colors.textMuted }}>›</Text>
        </Pressable>
      </Link>
      <Placeholder text="Konto, Größen, Stile und Abo folgen in den Blöcken A3, D und F." />
      <Placeholder text={`Version ${Constants.expoConfig?.version ?? '–'}`} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  eintrag: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
