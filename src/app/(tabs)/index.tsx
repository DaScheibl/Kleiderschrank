import { router } from 'expo-router';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { wearDailyOutfit } from '@/data/repositories/outfit-repository';
import { useDailyCandidates } from '@/hooks/use-daily-candidates';
import { useDailyChoice } from '@/hooks/use-daily-choice';
import { useToday } from '@/hooks/use-today';
import { Button } from '@/ui/components/button';
import { OccasionCard } from '@/ui/components/occasion-card';
import { OutfitView } from '@/ui/components/outfit-view';
import { Screen } from '@/ui/components/screen';
import { WeatherCard } from '@/ui/components/weather-card';
import { fontSize, fontWeight, radius, spacing } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/use-theme';

export default function HeuteScreen() {
  const { colors } = useTheme();
  const datum = useToday();
  const { wetter, anlassAnzeige, ergebnis } = useDailyCandidates(datum);
  const { wahl } = useDailyChoice(datum);
  const box = [styles.box, { backgroundColor: colors.surfaceRaised, borderColor: colors.border }];

  function tragen() {
    if (!wahl) return;
    Alert.alert(
      'Trägst du das heute?',
      'Die Teile werden als getragen gezählt; was die Wäscheschwelle erreicht, wandert in den Korb. Danach lässt sich die Wahl für heute nicht mehr ändern.',
      [
        { text: 'Abbrechen', style: 'cancel' },
        { text: 'Ja, trage ich', onPress: () => wearDailyOutfit(wahl.outfit.id, datum) },
      ],
    );
  }

  return (
    <Screen>
      <WeatherCard wetter={wetter} />
      <OccasionCard anzeige={anlassAnzeige} />

      {wahl ? (
        <View style={box}>
          <OutfitView
            titel={wahl.outfit.titel}
            begruendung={wahl.outfit.begruendung}
            teile={wahl.teile}
          />
          {wahl.outfit.getragen ? (
            <Text
              style={{
                color: colors.accent,
                fontSize: fontSize.body,
                fontWeight: fontWeight.semibold,
              }}>
              Getragen – viel Spaß heute.
            </Text>
          ) : (
            <>
              <Button label="Trage ich heute" onPress={tragen} />
              <Button
                label="Anderes wählen"
                variant="secondary"
                onPress={() => router.navigate('/outfit')}
              />
            </>
          )}
        </View>
      ) : (
        <View style={box}>
          <Text style={[styles.titel, { color: colors.text }]}>Wähl dein Outfit für heute</Text>
          <Text style={{ color: colors.textMuted, fontSize: fontSize.body }}>
            {ergebnis && ergebnis.fehlend.length > 0
              ? 'Für ein vollständiges Outfit fehlt gerade etwas – im Outfit-Tab steht, was.'
              : 'Wisch durch die Vorschläge des Tages und such dir eins aus.'}
          </Text>
          <Button label="Zu den Vorschlägen" onPress={() => router.navigate('/outfit')} />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  box: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.lg,
    gap: spacing.md,
  },
  titel: { fontSize: fontSize.title, fontWeight: fontWeight.bold },
});
