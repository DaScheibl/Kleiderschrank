import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { setLaundryStatus } from '@/data/repositories/garment-repository';
import type { Kleidungsstueck, Waeschestatus } from '@/domain/modell/typen';
import { useGarmentsInLaundry } from '@/hooks/use-garments';
import { Button } from '@/ui/components/button';
import { GarmentRow } from '@/ui/components/garment-row';
import { Placeholder, Screen } from '@/ui/components/screen';
import { fontSize, fontWeight, spacing } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/use-theme';

export default function WaescheScreen() {
  const korb = useGarmentsInLaundry('korb');
  const maschine = useGarmentsInLaundry('maschine');

  return (
    <Screen>
      <Abschnitt
        titel={`Wäschekorb (${korb.length})`}
        leer="Der Korb ist leer."
        teile={korb}
        einzelZiel="maschine"
        einzelLabel="Maschine"
        alleLabel="Alles in die Maschine"
      />
      <Abschnitt
        titel={`In der Maschine (${maschine.length})`}
        leer="Gerade läuft nichts."
        teile={maschine}
        einzelZiel="sauber"
        einzelLabel="Sauber"
        alleLabel="Fertig – alles wieder in den Schrank"
      />
    </Screen>
  );
}

interface AbschnittProps {
  titel: string;
  leer: string;
  teile: Kleidungsstueck[];
  einzelZiel: Waeschestatus;
  einzelLabel: string;
  alleLabel: string;
}

function Abschnitt({ titel, leer, teile, einzelZiel, einzelLabel, alleLabel }: AbschnittProps) {
  const { colors } = useTheme();
  return (
    <View style={styles.abschnitt}>
      <Text style={[styles.titel, { color: colors.text }]}>{titel}</Text>
      {teile.length === 0 ? <Placeholder text={leer} /> : null}
      {teile.map((teil) => (
        <GarmentRow
          key={teil.id}
          teil={teil}
          onPress={() => router.push(`/schrank/${teil.id}`)}
          action={
            <Text
              accessibilityRole="button"
              onPress={() => setLaundryStatus([teil.id], einzelZiel)}
              style={[styles.aktion, { color: colors.accent }]}>
              {einzelLabel}
            </Text>
          }
        />
      ))}
      {teile.length > 1 ? (
        <Button
          label={alleLabel}
          variant="secondary"
          onPress={() =>
            setLaundryStatus(
              teile.map((t) => t.id),
              einzelZiel,
            )
          }
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  abschnitt: { gap: spacing.sm, marginBottom: spacing.lg },
  titel: { fontSize: fontSize.title, fontWeight: fontWeight.bold },
  aktion: { fontSize: fontSize.body, fontWeight: fontWeight.semibold, padding: spacing.sm },
});
