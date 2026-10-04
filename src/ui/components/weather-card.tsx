import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { WETTERLAGE_NAMEN } from '@/domain/wetter/wetter';
import type { WetterAnzeige } from '@/hooks/use-weather';
import { requestLocationPermission } from '@/services/location';

import { fontSize, fontWeight, radius, spacing } from '../theme/tokens';
import { useTheme } from '../theme/use-theme';
import { Button } from './button';

const WAERME_NAMEN = ['Sommer', 'Übergang', 'kühl', 'Winter'] as const;

export function WeatherCard({ wetter }: { wetter: WetterAnzeige }) {
  const { colors } = useTheme();
  const box = [styles.box, { backgroundColor: colors.surfaceRaised, borderColor: colors.border }];

  if (wetter.zustand === 'laedt') {
    return (
      <View style={box}>
        <Text style={{ color: colors.textMuted }}>Wetter wird geladen …</Text>
      </View>
    );
  }

  if (wetter.zustand === 'braucht_ort') {
    return (
      <View style={box}>
        <Text style={[styles.titel, { color: colors.text }]}>Wetter für deine Vorschläge</Text>
        <Text style={{ color: colors.text, fontSize: fontSize.body }}>
          Damit Jacke und Schuhe zum Wetter passen, braucht die App deinen ungefähren Ort. Er wird
          auf etwa einen Kilometer gerundet und nur für die Wettervorhersage verwendet.
        </Text>
        <Button
          label="Ungefähren Standort verwenden"
          onPress={async () => {
            await requestLocationPermission();
            wetter.neuLaden();
          }}
        />
        <Button
          label="Ort von Hand eingeben"
          variant="secondary"
          onPress={() => router.push('/ort')}
        />
      </View>
    );
  }

  const { tag, vorhersage } = wetter;
  if (!tag || !vorhersage) {
    return (
      <View style={box}>
        <Text style={{ color: colors.text }}>{wetter.meldung ?? 'Kein Wetter verfügbar.'}</Text>
        <Button label="Erneut versuchen" variant="secondary" onPress={wetter.neuLaden} />
      </View>
    );
  }

  const stand = new Date(vorhersage.abgerufen).toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const regen = Math.round(tag.regenrisiko * 100);

  return (
    <View style={box}>
      <View style={styles.kopf}>
        <Text style={[styles.titel, { color: colors.text }]}>
          {tag.fuerMorgen ? 'Morgen' : 'Heute'} · {WETTERLAGE_NAMEN[tag.lage]}
        </Text>
        <Text
          accessibilityRole="button"
          onPress={() => router.push('/ort')}
          style={{ color: colors.accent, fontSize: fontSize.caption }}>
          {vorhersage.ort.name}
        </Text>
      </View>

      <Text style={[styles.temperatur, { color: colors.text }]}>
        gefühlt {Math.round(tag.gefuehltMin)}° bis {Math.round(tag.gefuehltMax)}°
      </Text>
      <Text style={{ color: colors.text, fontSize: fontSize.body }}>
        Regen {regen} %{tag.regenGeschaetzt ? ' (geschätzt)' : ''}
        {tag.regenAb ? ` · ab ${tag.regenAb}` : ''} · Wind bis {tag.windMaxKmh} km/h
      </Text>
      {wetter.ziel !== null ? (
        <Text style={{ color: colors.textMuted, fontSize: fontSize.caption }}>
          Kleidung: {WAERME_NAMEN[wetter.ziel]}
        </Text>
      ) : null}

      <Text
        style={{
          color: vorhersage.veraltet ? colors.warning : colors.textMuted,
          fontSize: fontSize.caption,
        }}>
        {vorhersage.veraltet ? `Ohne Verbindung – Stand ${stand}` : `Stand ${stand}`} · Wetterdaten:
        MET Norway (CC BY 4.0)
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  kopf: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: spacing.sm,
  },
  titel: { fontSize: fontSize.bodyLarge, fontWeight: fontWeight.semibold, flexShrink: 1 },
  temperatur: { fontSize: fontSize.headline, fontWeight: fontWeight.bold },
});
