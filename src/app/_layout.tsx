import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useSyncExternalStore } from 'react';
import { Text, View } from 'react-native';

import { activeDatabaseFile, getDb, setDatabaseReady, subscribeDatabase } from '@/data/db/client';
import migrations from '@/data/db/migrations/migrations';
import { onDatabaseReady } from '@/services/sync/sync-service';
import { AccountConflictPrompt } from '@/ui/components/account-conflict-prompt';
import { spacing } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/use-theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  // Beim Kontowechsel kann eine andere Schrank-Datei aktiv werden; dann baut sich alles neu auf.
  const datei = useSyncExternalStore(subscribeDatabase, activeDatabaseFile);
  return <Schrank key={datei} datei={datei} />;
}

function Schrank({ datei }: { datei: string }) {
  const { colors, isDark } = useTheme();
  const { success, error } = useMigrations(getDb(), migrations);

  useEffect(() => {
    if (success || error) SplashScreen.hideAsync();
    if (success) {
      setDatabaseReady(datei);
      onDatabaseReady();
    }
  }, [success, error, datei]);

  if (error) {
    // Lokale Daten bleiben unangetastet; die App startet nur nicht weiter.
    return (
      <View style={{ flex: 1, justifyContent: 'center', padding: spacing.xl }}>
        <Text>Die lokale Datenbank konnte nicht aktualisiert werden: {error.message}</Text>
      </View>
    );
  }
  if (!success) return null;

  const base = isDark ? DarkTheme : DefaultTheme;
  return (
    <ThemeProvider
      value={{
        ...base,
        colors: {
          ...base.colors,
          background: colors.background,
          card: colors.surface,
          text: colors.text,
          border: colors.border,
          primary: colors.accent,
        },
      }}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }} />
      <AccountConflictPrompt />
    </ThemeProvider>
  );
}
