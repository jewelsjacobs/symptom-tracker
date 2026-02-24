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
};

/**
 * Liquid Glass card — frosted blur surface with specular top-edge highlight
 * and warm-tinted shadow. Use over gradient backgrounds.
 */
export default function GlassCard({
  children,
  style,
  intensity = 50,
  borderRadius = radius.lg,
}: Props) {
  return (
    <View style={[styles.shadow, { borderRadius }, style]}>
      <BlurView
        intensity={intensity}
        tint="light"
        style={[styles.blur, { borderRadius }]}
      >
        <View style={[styles.inner, { borderRadius }]}>
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
