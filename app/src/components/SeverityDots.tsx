import React, { useRef, useEffect } from 'react';
import { StyleSheet, View, Pressable, Animated } from 'react-native';
import { severity as severityColors } from '../theme';
import EbbText from './EbbText';

type Props = {
  value: number | null;            // 1-5 or null
  onChange: (value: number) => void;
  /** Use light styling (white outlines) for glass/gradient backgrounds */
  variant?: 'light' | 'dark';
};

/**
 * 5-dot severity selector with spring scale animation.
 * Each dot is a 44x44 touch target. Selected dot fills with severity color.
 * Numbers inside dots provide non-color secondary cue (G3).
 */
export default function SeverityDots({ value, onChange, variant = 'light' }: Props) {
  return (
    <View>
      <View style={styles.row}>
        {[1, 2, 3, 4, 5].map((level) => (
          <Dot
            key={level}
            level={level}
            selected={value === level}
            onPress={() => onChange(level)}
            variant={variant}
          />
        ))}
      </View>
      <View style={styles.labels}>
        <EbbText type="caption" style={variant === 'light' ? styles.labelLight : styles.labelDark}>
          Mild
        </EbbText>
        <EbbText type="caption" style={variant === 'light' ? styles.labelLight : styles.labelDark}>
          Severe
        </EbbText>
      </View>
    </View>
  );
}

function Dot({
  level,
  selected,
  onPress,
  variant,
}: {
  level: number;
  selected: boolean;
  onPress: () => void;
  variant: 'light' | 'dark';
}) {
  const scale = useRef(new Animated.Value(selected ? 1.2 : 1)).current;

  useEffect(() => {
    Animated.spring(scale, {
      toValue: selected ? 1.2 : 1,
      useNativeDriver: true,
      friction: 6,
    }).start();
  }, [selected, scale]);

  const borderColor =
    variant === 'light' ? 'rgba(255,255,255,0.4)' : '#E5E0DD';

  const numberColor = selected
    ? '#FFFFFF'
    : variant === 'light'
      ? 'rgba(255,255,255,0.6)'
      : '#7A706B';

  return (
    <Pressable onPress={onPress} style={styles.touchTarget}>
      <Animated.View
        style={[
          styles.dot,
          { transform: [{ scale }] },
          selected
            ? { backgroundColor: severityColors[level - 1] }
            : { borderWidth: 2, borderColor },
        ]}
      >
        <EbbText type="caption" style={[styles.dotNumber, { color: numberColor }]}>{level}</EbbText>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  touchTarget: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dotNumber: {
    fontWeight: '700',
    textAlign: 'center',
  },
  labels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  labelLight: {
    color: 'rgba(255,255,255,0.7)',
  },
  labelDark: {
    color: '#7A706B',
  },
});
