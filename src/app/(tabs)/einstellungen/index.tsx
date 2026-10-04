import Constants from 'expo-constants';
import { Link, type Href } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';

import { Placeholder, Screen } from '@/ui/components/screen';
import { fontSize, radius, spacing } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/use-theme';

export default function EinstellungenScreen() {
  const { colors } = useTheme();
  return (
    <Screen>
      <Eintrag href="/einstellungen/sync" label="Konto & Abgleich" />
      <Eintrag href="/einstellungen/waescheschwellen" label="Wäscheschwellen" />
      <Placeholder text="Größen, Stile und Abo folgen in den Blöcken D und F." />
      <Text style={{ color: colors.textMuted, fontSize: fontSize.caption }}>
        Version {Constants.expoConfig?.version ?? '–'}
      </Text>
    </Screen>
  );
}

function Eintrag({ href, label }: { href: Href; label: string }) {
  const { colors } = useTheme();
  return (
    <Link href={href} asChild>
      <Pressable
        style={[
          styles.eintrag,
          { backgroundColor: colors.surfaceRaised, borderColor: colors.border },
        ]}>
        <Text style={{ color: colors.text, fontSize: fontSize.bodyLarge }}>{label}</Text>
        <Text style={{ color: colors.textMuted }}>›</Text>
      </Pressable>
    </Link>
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
