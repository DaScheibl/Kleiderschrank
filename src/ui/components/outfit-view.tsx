import { StyleSheet, Text, View } from 'react-native';

import type { Kleidungsstueck, Rolle } from '@/domain/modell/typen';

import { fontSize, fontWeight, radius, spacing } from '../theme/tokens';
import { useTheme } from '../theme/use-theme';

const ROLLEN_NAMEN: Record<Rolle, string> = {
  oberteil: 'Oberteil',
  hose: 'Hose',
  jacke: 'Jacke',
  schuhe: 'Schuhe',
  accessoire: 'Accessoire',
  schmuck: 'Schmuck',
};

interface OutfitViewProps {
  titel: string | null;
  begruendung: string | null;
  teile: { rolle: Rolle; teil: Kleidungsstueck }[];
}

/** Ein Outfit mit Titel, Begründung und seinen Teilen. Bilder kommen mit C1. */
export function OutfitView({ titel, begruendung, teile }: OutfitViewProps) {
  const { colors } = useTheme();
  return (
    <View style={styles.wrapper}>
      {titel ? <Text style={[styles.titel, { color: colors.text }]}>{titel}</Text> : null}
      {begruendung ? (
        <Text style={{ color: colors.text, fontSize: fontSize.body }}>{begruendung}</Text>
      ) : null}
      <View style={styles.teile}>
        {teile.map(({ rolle, teil }) => (
          <View key={teil.id} style={styles.zeile}>
            <View
              style={[
                styles.swatch,
                { backgroundColor: teil.farbeHex, borderColor: colors.border },
              ]}
            />
            <View style={styles.text}>
              <Text style={{ color: colors.textMuted, fontSize: fontSize.caption }}>
                {ROLLEN_NAMEN[rolle]}
              </Text>
              <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
                {teil.name}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

export function kandidatTeile(k: {
  oberteil: Kleidungsstueck;
  hose: Kleidungsstueck;
  jacke: Kleidungsstueck | null;
  schuhe: Kleidungsstueck | null;
  schmuck: Kleidungsstueck[];
}): { rolle: Rolle; teil: Kleidungsstueck }[] {
  return [
    { rolle: 'oberteil' as const, teil: k.oberteil },
    { rolle: 'hose' as const, teil: k.hose },
    ...(k.jacke ? [{ rolle: 'jacke' as const, teil: k.jacke }] : []),
    ...(k.schuhe ? [{ rolle: 'schuhe' as const, teil: k.schuhe }] : []),
    ...k.schmuck.map((s) => ({ rolle: 'schmuck' as const, teil: s })),
  ];
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.sm },
  titel: { fontSize: fontSize.title, fontWeight: fontWeight.bold },
  teile: { gap: spacing.sm, marginTop: spacing.xs },
  zeile: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  swatch: { width: 44, height: 44, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth },
  text: { flex: 1 },
  name: { fontSize: fontSize.bodyLarge, fontWeight: fontWeight.semibold },
});
