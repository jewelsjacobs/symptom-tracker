import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, RadialGradient, Stop, Circle } from 'react-native-svg';
import { colors } from '../theme';

type Props = {
  children: React.ReactNode;
};

/**
 * Warm cream background with soft radial SVG blobs.
 * Used on History, Trends, Settings, and Onboarding screens.
 */
export default function CreamBackground({ children }: Props) {
  return (
    <View style={styles.container}>
      <Svg style={StyleSheet.absoluteFill} viewBox="0 0 400 800" preserveAspectRatio="xMidYMid slice">
        <Defs>
          <RadialGradient id="blob-amber" cx="70%" cy="15%" rx="45%" ry="30%">
            <Stop offset="0%" stopColor={colors.amber} stopOpacity={0.12} />
            <Stop offset="100%" stopColor={colors.amber} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="blob-coral" cx="25%" cy="55%" rx="40%" ry="35%">
            <Stop offset="0%" stopColor={colors.primary} stopOpacity={0.08} />
            <Stop offset="100%" stopColor={colors.primary} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx="280" cy="120" r="220" fill="url(#blob-amber)" />
        <Circle cx="100" cy="440" r="200" fill="url(#blob-coral)" />
      </Svg>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
