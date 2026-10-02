import { Stack } from 'expo-router';

import { useTheme } from '@/ui/theme/use-theme';

export default function SchrankLayout() {
  const { colors } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
      }}>
      <Stack.Screen name="index" options={{ title: 'Schrank' }} />
      <Stack.Screen name="neu" options={{ title: 'Neues Teil', presentation: 'modal' }} />
    </Stack>
  );
}
