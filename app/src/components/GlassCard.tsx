import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radius } from '../theme';

type Props = {
  children: React.ReactNode;
  style?: ViewStyle;
  intensity?: number;
  borderRadius?: number;
  variant?: 'gradient' | 'cream';
};

/**
 * Liquid Glass card — frosted blur surface with specular top-edge highlight
 * and warm-tinted shadow.
 *
 * variant='gradient' (default): use over gradient backgrounds (Home, DailyLog)
 * variant='cream': use over cream backgrounds (History, Trends, Settings, Onboarding)
 */
export default function GlassCard({
  children,
  style,
  intensity,
  borderRadius = radius.lg,
  variant = 'gradient',
}: Props) {
  const isCream = variant === 'cream';
  const blurIntensity = intensity ?? (isCream ? 70 : 50);

  return (
    <View
      style={[
        isCream ? creamStyles.shadow : styles.shadow,
        { borderRadius },
        style,
      ]}
    >
      <BlurView
        intensity={blurIntensity}
        tint="light"
        style={[styles.blur, { borderRadius }]}
      >
        <View
          style={[
            isCream ? creamStyles.inner : styles.inner,
            { borderRadius },
          ]}
        >
          {/* Specular highlight — bright top edge simulating light catch */}
          <LinearGradient
            colors={['rgba(255,255,255,0.6)', 'rgba(255,255,255,0)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.specular, { borderTopLeftRadius: borderRadius, borderTopRightRadius: borderRadius }]}
          />
          {children}
        </View>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  shadow: {
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  blur: {
    overflow: 'hidden',
  },
  inner: {
    backgroundColor: colors.surfaceGlass,
    borderWidth: 1,
    borderColor: colors.borderGlass,
  },
  specular: {
    height: 1,
    width: '100%',
  },
});

const creamStyles = StyleSheet.create({
  shadow: {
    shadowColor: 'rgba(194,85,63,0.10)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 32,
    elevation: 8,
  },
  inner: {
    backgroundColor: colors.surfaceGlassCream,
    borderWidth: 1,
    borderColor: colors.borderGlassCream,
  },
});
