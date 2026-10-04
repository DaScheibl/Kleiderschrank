import type { ReactNode } from 'react';
import { StyleSheet, Text, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { fontSize, fontWeight, radius, spacing } from '../theme/tokens';
import { useTheme } from '../theme/use-theme';

export type SwipeRichtung = 'rechts' | 'links';

interface SwipeCardProps {
  children: ReactNode;
  /** rechts = gefällt mir, links = weiter */
  onSwipe: (richtung: SwipeRichtung) => void;
}

/** Ab diesem Anteil der Bildschirmbreite zählt ein Wischen. */
const SCHWELLE = 0.28;

export function SwipeCard({ children, onSwipe }: SwipeCardProps) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const x = useSharedValue(0);
  const y = useSharedValue(0);

  // Erst ab deutlicher Seitwärtsbewegung wischen; senkrecht bleibt Scrollen.
  const pan = Gesture.Pan()
    .activeOffsetX([-15, 15])
    .failOffsetY([-20, 20])
    .onUpdate((e) => {
      x.value = e.translationX;
      y.value = e.translationY * 0.2;
    })
    .onEnd((e) => {
      if (Math.abs(e.translationX) > width * SCHWELLE) {
        const richtung: SwipeRichtung = e.translationX > 0 ? 'rechts' : 'links';
        x.value = withTiming(Math.sign(e.translationX) * width * 1.5, { duration: 200 }, () => {
          scheduleOnRN(onSwipe, richtung);
        });
      } else {
        x.value = withSpring(0);
        y.value = withSpring(0);
      }
    });

  const karte = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.value },
      { translateY: y.value },
      { rotate: `${interpolate(x.value, [-width, width], [-12, 12])}deg` },
    ],
  }));
  const gefaellt = useAnimatedStyle(() => ({
    opacity: interpolate(x.value, [0, width * SCHWELLE], [0, 1], 'clamp'),
  }));
  const weiter = useAnimatedStyle(() => ({
    opacity: interpolate(x.value, [-width * SCHWELLE, 0], [1, 0], 'clamp'),
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        style={[
          styles.karte,
          { backgroundColor: colors.surfaceRaised, borderColor: colors.border },
          karte,
        ]}>
        <Animated.View
          style={[styles.stempel, styles.links, { borderColor: colors.accent }, gefaellt]}>
          <Text style={[styles.stempelText, { color: colors.accent }]}>GEFÄLLT</Text>
        </Animated.View>
        <Animated.View
          style={[styles.stempel, styles.rechts, { borderColor: colors.textMuted }, weiter]}>
          <Text style={[styles.stempelText, { color: colors.textMuted }]}>WEITER</Text>
        </Animated.View>
        {children}
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  karte: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.xl,
    gap: spacing.md,
    minHeight: 360,
  },
  stempel: {
    position: 'absolute',
    top: spacing.lg,
    borderWidth: 2,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    zIndex: 1,
  },
  links: { left: spacing.lg, transform: [{ rotate: '-10deg' }] },
  rechts: { right: spacing.lg, transform: [{ rotate: '10deg' }] },
  stempelText: { fontSize: fontSize.body, fontWeight: fontWeight.bold, letterSpacing: 1 },
});
