import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import Constants from 'expo-constants';
import { router, type Href } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { settingsQuery, updateSettings } from '@/data/repositories/settings-repository';
import { FORMALITAET_NAMEN } from '@/domain/kalender/anlass';
import { STANDARD_EINSTELLUNGEN } from '@/domain/modell/konstanten';
import type { Formalitaet } from '@/domain/modell/typen';
import { Chip } from '@/ui/components/chip';
import { Placeholder, Screen } from '@/ui/components/screen';
import { fontSize, fontWeight, radius, spacing } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/use-theme';

const STUFEN: Formalitaet[] = [0, 1, 2, 3];

export default function EinstellungenScreen() {
  const { colors } = useTheme();
  const { data } = useLiveQuery(settingsQuery());
  const alltag = data[0]?.alltagsFormalitaet ?? STANDARD_EINSTELLUNGEN.alltagsFormalitaet;

  return (
    <Screen>
      <Eintrag href="/einstellungen/sync" label="Konto & Abgleich" />
      <Eintrag href="/einstellungen/waescheschwellen" label="Wäscheschwellen" />

      <View
        style={[
          styles.eintrag,
          styles.spalte,
          { backgroundColor: colors.surfaceRaised, borderColor: colors.border },
        ]}>
        <Text style={[styles.titel, { color: colors.text }]}>Dein Alltag</Text>
        <Text style={{ color: colors.textMuted, fontSize: fontSize.caption }}>
          Gilt an Tagen ohne Termin mit Dresscode.
        </Text>
        <View style={styles.chips}>
          {STUFEN.map((stufe) => (
            <Chip
              key={stufe}
              label={FORMALITAET_NAMEN[stufe]}
              selected={stufe === alltag}
              onPress={() => updateSettings({ alltagsFormalitaet: stufe })}
            />
          ))}
        </View>
      </View>

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
    <Pressable
      accessibilityRole="link"
      onPress={() => router.push(href)}
      style={[
        styles.eintrag,
        { backgroundColor: colors.surfaceRaised, borderColor: colors.border },
      ]}>
      <Text style={{ color: colors.text, fontSize: fontSize.bodyLarge }}>{label}</Text>
      <Text style={{ color: colors.textMuted }}>›</Text>
    </Pressable>
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
  spalte: { flexDirection: 'column', alignItems: 'stretch', gap: spacing.sm },
  titel: { fontSize: fontSize.bodyLarge, fontWeight: fontWeight.semibold },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
