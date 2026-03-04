import React from 'react';
import { Pressable, StyleSheet, ActivityIndicator, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { radius } from '../theme';
import EbbText from './EbbText';

type Props = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
};

/**
 * Coral gradient CTA button — shared primary action across all screens.
 */
export default function CoralButton({ label, onPress, disabled, loading, style }: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.wrapper,
        (disabled || loading) && styles.disabled,
        pressed && !disabled && !loading && styles.pressed,
        style,
      ]}
    >
      <LinearGradient
        colors={['#E8725A', '#C2553F']}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={styles.gradient}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <EbbText type="button" style={styles.label}>{label}</EbbText>
        )}
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: radius.lg,
    shadowColor: 'rgba(194,85,63,0.45)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 28,
    elevation: 8,
  },
  gradient: {
    height: 56,
    borderRadius: radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    color: '#FFFFFF',
  },
  disabled: {
    opacity: 0.6,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
});
