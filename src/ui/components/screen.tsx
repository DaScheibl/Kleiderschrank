import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../theme/use-theme';
import { fontSize, fontWeight, spacing } from '../theme/tokens';

interface ScreenProps {
  title?: string;
  children?: ReactNode;
  scroll?: boolean;
}

export function Screen({ title, children, scroll = true }: ScreenProps) {
  const { colors } = useTheme();
  const content = (
    <>
      {title ? <Text style={[styles.title, { color: colors.text }]}>{title}</Text> : null}
      {children}
    </>
  );

  return scroll ? (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled">
      {content}
    </ScrollView>
  ) : (
    <View style={[styles.content, styles.fill, { backgroundColor: colors.background }]}>
      {content}
    </View>
  );
}

export function Placeholder({ text }: { text: string }) {
  const { colors } = useTheme();
  return <Text style={[styles.placeholder, { color: colors.textMuted }]}>{text}</Text>;
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.md },
  title: { fontSize: fontSize.headline, fontWeight: fontWeight.bold },
  placeholder: { fontSize: fontSize.body },
});
