import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { createGarment } from '@/data/repositories/garment-repository';
import type { AnlegenFehler } from '@/domain/kleidungsstueck/anlegen';
import { GRUNDFARBEN, type Grundfarbe } from '@/domain/modell/farben';
import { KATEGORIE_NAMEN } from '@/domain/modell/konstanten';
import { KATEGORIEN, type Kategorie } from '@/domain/modell/typen';
import { Button } from '@/ui/components/button';
import { Chip } from '@/ui/components/chip';
import { Screen } from '@/ui/components/screen';
import { fontSize, fontWeight, radius, spacing } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/use-theme';

const FEHLERTEXT: Record<AnlegenFehler, string> = {
  name_leer: 'Bitte gib dem Teil einen Namen.',
  farbe_ungueltig: 'Diese Farbe ist ungültig.',
  unterart_passt_nicht: 'Diese Unterart passt nicht zur Kategorie.',
};

export default function NeuesTeilScreen() {
  const { colors } = useTheme();
  const [name, setName] = useState('');
  const [kategorie, setKategorie] = useState<Kategorie>('oberteil');
  const [farbe, setFarbe] = useState<Grundfarbe | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [speichert, setSpeichert] = useState(false);

  async function speichern() {
    if (!farbe) return;
    setSpeichert(true);
    try {
      const ergebnis = await createGarment({
        name,
        kategorie,
        farbeHex: farbe.hex,
        farbeName: farbe.name,
      });
      if (ergebnis.ok) router.back();
      else setFehler(FEHLERTEXT[ergebnis.fehler]);
    } catch {
      setFehler('Speichern hat nicht geklappt. Bitte versuch es noch einmal.');
    } finally {
      setSpeichert(false);
    }
  }

  return (
    <Screen>
      <Text style={[styles.label, { color: colors.text }]}>Name</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="z. B. Weißes Oxfordhemd"
        placeholderTextColor={colors.textMuted}
        autoFocus
        style={[
          styles.input,
          { color: colors.text, borderColor: colors.border, backgroundColor: colors.surfaceRaised },
        ]}
      />

      <Text style={[styles.label, { color: colors.text }]}>Kategorie</Text>
      <View style={styles.chips}>
        {KATEGORIEN.map((k) => (
          <Chip
            key={k}
            label={KATEGORIE_NAMEN[k]}
            selected={k === kategorie}
            onPress={() => setKategorie(k)}
          />
        ))}
      </View>

      <Text style={[styles.label, { color: colors.text }]}>Hauptfarbe</Text>
      <View style={styles.chips}>
        {GRUNDFARBEN.map((f) => (
          <Chip
            key={f.name}
            label={f.name}
            swatch={f.hex}
            selected={f.name === farbe?.name}
            onPress={() => setFarbe(f)}
          />
        ))}
      </View>

      {fehler ? <Text style={{ color: colors.danger }}>{fehler}</Text> : null}

      <Button
        label={speichert ? 'Speichert …' : 'Speichern'}
        onPress={speichern}
        disabled={speichert || farbe === null || name.trim().length === 0}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: fontSize.body, fontWeight: fontWeight.semibold, marginTop: spacing.sm },
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: fontSize.bodyLarge,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
