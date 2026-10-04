import { Stack } from 'expo-router';

import { useTheme } from '@/ui/theme/use-theme';

export default function EinstellungenLayout() {
  const { colors } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
      }}>
      <Stack.Screen name="index" options={{ title: 'Einstellungen' }} />
      <Stack.Screen name="waescheschwellen" options={{ title: 'Wäscheschwellen' }} />
      <Stack.Screen name="sync" options={{ title: 'Konto & Abgleich' }} />
    </Stack>
  );
}
