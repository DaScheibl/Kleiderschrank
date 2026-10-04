import { StyleSheet, Text, View } from 'react-native';

import { FORMALITAET_NAMEN } from '@/domain/kalender/anlass';
import type { AnlassAnzeige } from '@/hooks/use-occasion';

import { fontSize, fontWeight, radius, spacing } from '../theme/tokens';
import { useTheme } from '../theme/use-theme';
import { Button } from './button';

const uhr = (iso: string) =>
  new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });

export function OccasionCard({ anzeige }: { anzeige: AnlassAnzeige }) {
  const { colors } = useTheme();
  const { anlass, zugang, termine } = anzeige;
  const termin = anlass.massgeblicherTermin;

  return (
    <View
      style={[styles.box, { backgroundColor: colors.surfaceRaised, borderColor: colors.border }]}>
      <Text style={[styles.titel, { color: colors.text }]}>
        Anlass: {FORMALITAET_NAMEN[anlass.formalitaet]}
      </Text>
      <Text style={{ color: colors.text, fontSize: fontSize.body }}>
        {termin
          ? `${termin.titel} um ${uhr(termin.beginn)}`
          : termine.length === 0 && zugang === 'erteilt'
            ? 'Heute keine Termine mit Uhrzeit – es gilt dein Alltagswert.'
            : 'Es gilt dein Alltagswert (änderbar in den Einstellungen).'}
      </Text>

      {zugang === 'offen' ? (
        <>
          <Text style={{ color: colors.textMuted, fontSize: fontSize.caption }}>
            Mit Lesezugriff auf deinen Kalender erkennt die App Termine mit Dresscode. Titel und
            Orte bleiben auf dem Gerät.
          </Text>
          <Button label="Termine berücksichtigen" variant="secondary" onPress={anzeige.freigeben} />
        </>
      ) : null}
      {zugang === 'verweigert' ? (
        <Text style={{ color: colors.textMuted, fontSize: fontSize.caption }}>
          Kalenderzugriff ist abgelehnt. Du kannst ihn in den Systemeinstellungen erlauben.
        </Text>
      ) : null}
      {zugang === 'nicht_verfuegbar' ? (
        <Text style={{ color: colors.textMuted, fontSize: fontSize.caption }}>
          Der Kalender steht erst in der installierten App zur Verfügung, nicht in Expo Go.
        </Text>
      ) : null}
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
  titel: { fontSize: fontSize.bodyLarge, fontWeight: fontWeight.semibold },
});
