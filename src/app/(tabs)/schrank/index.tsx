import { router, Stack } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { KATEGORIE_NAMEN, WAESCHESTATUS_NAMEN } from '@/domain/modell/konstanten';
import { useActiveGarments } from '@/hooks/use-garments';
import { Placeholder } from '@/ui/components/screen';
import { fontSize, fontWeight, radius, spacing } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/use-theme';

export default function SchrankScreen() {
  const { colors } = useTheme();
  const teile = useActiveGarments();

  return (
    <View style={[styles.fill, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable
              accessibilityRole="button"
              hitSlop={12}
              onPress={() => router.push('/schrank/neu')}>
              <Text style={{ color: colors.accent, fontSize: fontSize.bodyLarge }}>Hinzufügen</Text>
            </Pressable>
          ),
        }}
      />
      <FlatList
        data={teile}
        keyExtractor={(teil) => teil.id}
        numColumns={2}
        contentContainerStyle={styles.list}
        columnWrapperStyle={styles.row}
        ListEmptyComponent={
          <Placeholder text="Noch leer. Leg über „Hinzufügen“ dein erstes Teil an." />
        }
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="link"
            onPress={() => router.push(`/schrank/${item.id}`)}
            style={[
              styles.card,
              { backgroundColor: colors.surfaceRaised, borderColor: colors.border },
            ]}>
            {/* Bilder folgen in C1; bis dahin steht die Hauptfarbe für das Teil. */}
            <View style={[styles.swatch, { backgroundColor: item.farbeHex }]}>
              {item.waeschestatus !== 'sauber' ? (
                <Text
                  style={[
                    styles.badge,
                    { backgroundColor: colors.surfaceRaised, color: colors.warning },
                  ]}>
                  {WAESCHESTATUS_NAMEN[item.waeschestatus]}
                </Text>
              ) : null}
            </View>
            <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: fontSize.caption }}>
              {KATEGORIE_NAMEN[item.kategorie]} · {item.farbeName}
            </Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  list: { padding: spacing.lg, gap: spacing.md },
  row: { gap: spacing.md },
  card: {
    flex: 1,
    maxWidth: '50%',
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  swatch: { aspectRatio: 1, borderRadius: radius.md, padding: spacing.xs },
  badge: {
    alignSelf: 'flex-start',
    fontSize: fontSize.caption,
    fontWeight: fontWeight.semibold,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  name: { fontSize: fontSize.body, fontWeight: fontWeight.semibold },
});
