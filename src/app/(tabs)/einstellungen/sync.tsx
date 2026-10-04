import { router } from 'expo-router';
import { useSyncExternalStore } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { onLocalChange } from '@/data/changes';
import { pendingCount } from '@/data/sync/local-store';
import { useSyncState } from '@/hooks/use-sync';
import { deleteAccount, signOut } from '@/services/account';
import { exportData } from '@/services/export';
import { syncNow, type SyncStatus } from '@/services/sync/sync-service';
import { Button } from '@/ui/components/button';
import { Placeholder, Screen } from '@/ui/components/screen';
import { fontSize, fontWeight, radius, spacing } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/use-theme';

function uhrzeit(iso: string | null): string {
  if (!iso) return '–';
  return new Date(iso).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' });
}

function statusText(s: SyncStatus): string {
  switch (s.art) {
    case 'nicht_eingerichtet':
      return 'Nicht eingerichtet – die App arbeitet rein lokal.';
    case 'offline':
      return 'Keine Verbindung. Alles bleibt auf dem Gerät und wird später abgeglichen.';
    case 'laeuft':
      return 'Wird abgeglichen …';
    case 'bereit':
      return `Abgeglichen um ${uhrzeit(s.zuletzt)}`;
    case 'fehler':
      return `Abgleich fehlgeschlagen (${s.meldung}). Deine Daten sind sicher auf dem Gerät.`;
    case 'anderes_konto':
      return 'Wartet auf deine Entscheidung zum Kontowechsel.';
  }
}

export default function SyncScreen() {
  const { colors } = useTheme();
  const { status, kontoId, istAnonym, email } = useSyncState();
  // Wird bei jeder lokalen Änderung und bei jedem Statuswechsel neu gezählt.
  const offen = useSyncExternalStore(onLocalChange, pendingCount);

  return (
    <Screen>
      <View
        style={[styles.box, { backgroundColor: colors.surfaceRaised, borderColor: colors.border }]}>
        <Text style={[styles.titel, { color: colors.text }]}>Status</Text>
        <Text style={{ color: colors.text, fontSize: fontSize.body }}>{statusText(status)}</Text>
        <Text style={{ color: colors.textMuted, fontSize: fontSize.caption }}>
          Noch nicht übertragene Änderungen: {offen}
        </Text>
      </View>

      <View
        style={[styles.box, { backgroundColor: colors.surfaceRaised, borderColor: colors.border }]}>
        <Text style={[styles.titel, { color: colors.text }]}>Konto</Text>
        <Text style={{ color: colors.text, fontSize: fontSize.body }}>
          {kontoId
            ? istAnonym
              ? 'Ohne Anmeldung. Sichere deinen Schrank mit deiner E-Mail-Adresse, um ihn auf weiteren Geräten zu nutzen.'
              : `Angemeldet als ${email ?? '–'}`
            : 'Noch keine Verbindung zum Server.'}
        </Text>
        {kontoId ? (
          <Text style={{ color: colors.textMuted, fontSize: fontSize.caption }}>
            Konto-ID: {kontoId.slice(0, 8)}…
          </Text>
        ) : null}
      </View>

      <Button
        label="Jetzt abgleichen"
        onPress={() => void syncNow()}
        disabled={status.art === 'laeuft' || status.art === 'nicht_eingerichtet'}
      />
      {kontoId && istAnonym ? (
        <Button
          label="Mit E-Mail sichern oder anmelden"
          variant="secondary"
          onPress={() => router.push('/einstellungen/anmelden')}
        />
      ) : null}
      {kontoId && !istAnonym ? (
        <Button label="Abmelden" variant="secondary" onPress={abmelden} />
      ) : null}
      <Button label="Meine Daten exportieren" variant="secondary" onPress={exportieren} />
      {kontoId ? (
        <Button label="Konto löschen" variant="secondary" onPress={kontoLoeschen} />
      ) : null}

      <Placeholder text="Abgleich geschieht automatisch beim Öffnen, nach Änderungen und alle zwei Minuten. Fotos folgen mit Block C1. Bis zum Abo-Block wird für alle abgeglichen." />
    </Screen>
  );
}

function abmelden() {
  Alert.alert(
    'Abmelden?',
    'Dein Schrank bleibt auf diesem Gerät gespeichert und ist wieder da, sobald du dich mit derselben Adresse anmeldest. Bis dahin startest du mit einem leeren Schrank.',
    [
      { text: 'Abbrechen', style: 'cancel' },
      { text: 'Abmelden', onPress: () => void signOut() },
    ],
  );
}

async function exportieren() {
  try {
    await exportData();
  } catch {
    Alert.alert('Export fehlgeschlagen', 'Die Datei konnte nicht erstellt werden.');
  }
}

function kontoLoeschen() {
  Alert.alert(
    'Konto löschen?',
    'Gelöscht werden dein Konto und alle Daten auf dem Server, außerdem dein Schrank auf diesem Gerät. Das lässt sich nicht rückgängig machen. Exportiere vorher deine Daten, wenn du sie behalten möchtest.',
    [
      { text: 'Abbrechen', style: 'cancel' },
      { text: 'Erst exportieren', onPress: () => void exportieren() },
      {
        text: 'Weiter',
        style: 'destructive',
        onPress: () =>
          Alert.alert('Wirklich endgültig löschen?', 'Letzte Rückfrage.', [
            { text: 'Abbrechen', style: 'cancel' },
            {
              text: 'Endgültig löschen',
              style: 'destructive',
              onPress: async () => {
                const r = await deleteAccount();
                Alert.alert(
                  r.ok ? 'Konto gelöscht' : 'Nicht gelöscht',
                  r.ok ? 'Dein Konto und alle Daten wurden gelöscht.' : r.meldung,
                );
              },
            },
          ]),
      },
    ],
  );
}

const styles = StyleSheet.create({
  box: {
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
    gap: spacing.xs,
  },
  titel: { fontSize: fontSize.bodyLarge, fontWeight: fontWeight.semibold },
});
