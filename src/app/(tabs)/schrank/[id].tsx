import { Stack, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { setLaundryStatus } from '@/data/repositories/garment-repository';
import { markWorn } from '@/data/repositories/wear-repository';
import { KATEGORIE_NAMEN, WAESCHESTATUS_NAMEN } from '@/domain/modell/konstanten';
import { lokalesDatum } from '@/domain/zeit';
import { useGarmentDetail } from '@/hooks/use-garments';
import { Button } from '@/ui/components/button';
import { Placeholder, Screen } from '@/ui/components/screen';
import { fontSize, fontWeight, radius, spacing } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/use-theme';

function formatDatum(datum: string): string {
  const [j, m, t] = datum.split('-');
  return `${t}.${m}.${j}`;
}

export default function TeilDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const detail = useGarmentDetail(id);

  if (!detail) {
    return (
      <Screen>
        <Placeholder text="Dieses Teil gibt es nicht mehr." />
      </Screen>
    );
  }

  const { teil, statistik, schwelle } = detail;
  const heute = lokalesDatum(new Date());
  const heuteGetragen = statistik.zuletztGetragen === heute;
  const sauber = teil.waeschestatus === 'sauber';

  return (
    <Screen>
      <Stack.Screen options={{ title: teil.name }} />
      <View style={[styles.swatch, { backgroundColor: teil.farbeHex }]} />
      <Text style={[styles.meta, { color: colors.textMuted }]}>
        {KATEGORIE_NAMEN[teil.kategorie]} · {teil.farbeName}
      </Text>

      <View
        style={[styles.box, { backgroundColor: colors.surfaceRaised, borderColor: colors.border }]}>
        <Zeile label="Status" wert={WAESCHESTATUS_NAMEN[teil.waeschestatus]} />
        <Zeile
          label="Seit der Wäsche"
          wert={
            schwelle === 0
              ? `${statistik.getragenSeitWaesche}× (wird nie gewaschen)`
              : `${statistik.getragenSeitWaesche} von ${schwelle}×`
          }
        />
        <Zeile label="Insgesamt getragen" wert={`${statistik.getragenGesamt}×`} />
        <Zeile
          label="Zuletzt getragen"
          wert={statistik.zuletztGetragen ? formatDatum(statistik.zuletztGetragen) : 'noch nie'}
        />
      </View>

      <Button
        label={heuteGetragen ? 'Heute schon getragen' : 'Heute getragen'}
        onPress={() => markWorn(teil.id, heute)}
        disabled={heuteGetragen || !sauber}
      />
      {sauber ? (
        <Button
          label="In den Wäschekorb"
          variant="secondary"
          onPress={() => setLaundryStatus([teil.id], 'korb')}
        />
      ) : (
        <Button
          label="Wieder sauber"
          variant="secondary"
          onPress={() => setLaundryStatus([teil.id], 'sauber')}
        />
      )}
    </Screen>
  );
}

function Zeile({ label, wert }: { label: string; wert: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.zeile}>
      <Text style={{ color: colors.textMuted, fontSize: fontSize.body }}>{label}</Text>
      <Text style={{ color: colors.text, fontSize: fontSize.body, fontWeight: fontWeight.medium }}>
        {wert}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  swatch: { height: 160, borderRadius: radius.lg },
  meta: { fontSize: fontSize.body },
  box: {
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
    gap: spacing.sm,
  },
  zeile: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
});
