import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, TextInput } from 'react-native';

import { requestEmailCode, verifyEmailCode, type EmailModus } from '@/services/account';
import { Button } from '@/ui/components/button';
import { Placeholder, Screen } from '@/ui/components/screen';
import { fontSize, radius, spacing } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/use-theme';

export default function AnmeldenScreen() {
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [modus, setModus] = useState<EmailModus | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [beschaeftigt, setBeschaeftigt] = useState(false);

  const eingabe = [
    styles.input,
    { color: colors.text, borderColor: colors.border, backgroundColor: colors.surfaceRaised },
  ];

  async function codeAnfordern() {
    setBeschaeftigt(true);
    setFehler(null);
    const r = await requestEmailCode(email);
    setBeschaeftigt(false);
    if (r.ok) setModus(r.wert);
    else setFehler(r.meldung);
  }

  async function bestaetigen() {
    if (!modus) return;
    setBeschaeftigt(true);
    setFehler(null);
    const r = await verifyEmailCode(email, code, modus);
    setBeschaeftigt(false);
    if (r.ok) router.back();
    else setFehler(r.meldung);
  }

  return (
    <Screen>
      <Placeholder text="Mit deiner E-Mail-Adresse sicherst du deinen Schrank und kannst ihn auf weiteren Geräten nutzen. Ein Passwort gibt es nicht – du bekommst jedes Mal einen Code per E-Mail." />

      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="deine@email.de"
        placeholderTextColor={colors.textMuted}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        autoCorrect={false}
        editable={modus === null}
        style={eingabe}
      />

      {modus === null ? (
        <Button
          label={beschaeftigt ? 'Sendet …' : 'Code senden'}
          onPress={codeAnfordern}
          disabled={beschaeftigt || !email.includes('@')}
        />
      ) : (
        <>
          <Text style={{ color: colors.text, fontSize: fontSize.body }}>
            {modus === 'aufwerten'
              ? 'Wir haben dir einen Code geschickt. Damit wird dein Schrank zu deinem Konto.'
              : 'Zu dieser Adresse gibt es schon ein Konto. Mit dem Code meldest du dich dort an.'}
          </Text>
          <TextInput
            value={code}
            onChangeText={setCode}
            placeholder="Code aus der E-Mail"
            placeholderTextColor={colors.textMuted}
            keyboardType="number-pad"
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
            maxLength={10}
            style={eingabe}
          />
          <Button
            label={beschaeftigt ? 'Prüft …' : 'Bestätigen'}
            onPress={bestaetigen}
            disabled={beschaeftigt || code.trim().length < 6}
          />
          <Button
            label="Andere Adresse"
            variant="secondary"
            onPress={() => {
              setModus(null);
              setCode('');
            }}
          />
        </>
      )}

      {fehler ? <Text style={{ color: colors.danger }}>{fehler}</Text> : null}
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
