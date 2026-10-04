import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, TextInput } from 'react-native';

import { readSettings } from '@/data/repositories/settings-repository';
import { requestLocationPermission } from '@/services/location';
import { clearManualPlace, searchAndSavePlace } from '@/services/weather';
import { Button } from '@/ui/components/button';
import { Placeholder, Screen } from '@/ui/components/screen';
import { fontSize, radius, spacing } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/use-theme';

export default function OrtScreen() {
  const { colors } = useTheme();
  const aktuell = readSettings().ortManuell;
  const [name, setName] = useState(aktuell?.name ?? '');
  const [fehler, setFehler] = useState<string | null>(null);
  const [sucht, setSucht] = useState(false);

  async function suchen() {
    setSucht(true);
    setFehler(null);
    const r = await searchAndSavePlace(name);
    setSucht(false);
    if (r.ok) router.back();
    else setFehler(r.meldung);
  }

  return (
    <Screen>
      <Placeholder text="Für welchen Ort soll das Wetter gelten? Der Name wird über OpenStreetMap gesucht; dein Standort wird dafür nicht verwendet." />
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="z. B. München oder 80331"
        placeholderTextColor={colors.textMuted}
        autoFocus
        returnKeyType="search"
        onSubmitEditing={suchen}
        style={[
          styles.input,
          { color: colors.text, borderColor: colors.border, backgroundColor: colors.surfaceRaised },
        ]}
      />
      <Button
        label={sucht ? 'Sucht …' : 'Ort übernehmen'}
        onPress={suchen}
        disabled={sucht || name.trim().length < 2}
      />
      {fehler ? <Text style={{ color: colors.danger }}>{fehler}</Text> : null}
      {aktuell ? (
        <Button
          label="Stattdessen ungefähren Standort verwenden"
          variant="secondary"
          onPress={async () => {
            clearManualPlace();
            await requestLocationPermission();
            router.back();
          }}
        />
      ) : null}
      <Text style={{ color: colors.textMuted, fontSize: fontSize.caption }}>
        Ortssuche: Photon by komoot, Daten © OpenStreetMap-Mitwirkende (ODbL)
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: fontSize.bodyLarge,
  },
});
