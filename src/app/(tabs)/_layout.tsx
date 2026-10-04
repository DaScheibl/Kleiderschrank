import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import type { ColorValue } from 'react-native';

import { useTheme } from '@/ui/theme/use-theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

function tabIcon(name: IconName) {
  return function TabIcon({ color, size }: { color: ColorValue; size: number }) {
    return <Ionicons name={name} color={color} size={size} />;
  };
}

export default function TabLayout() {
  const { colors } = useTheme();
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
      }}>
      <Tabs.Screen
        name="index"
        options={{ title: 'Heute', tabBarIcon: tabIcon('sunny-outline') }}
      />
      <Tabs.Screen
        name="outfit"
        options={{ title: 'Outfit', tabBarIcon: tabIcon('layers-outline') }}
      />
      <Tabs.Screen
        name="schrank"
        options={{ title: 'Schrank', headerShown: false, tabBarIcon: tabIcon('shirt-outline') }}
      />
      <Tabs.Screen
        name="waesche"
        options={{ title: 'Wäsche', tabBarIcon: tabIcon('water-outline') }}
      />
      <Tabs.Screen
        name="einstellungen"
        options={{
          title: 'Einstellungen',
          headerShown: false,
          tabBarIcon: tabIcon('settings-outline'),
        }}
      />
    </Tabs>
  );
}
