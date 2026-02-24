import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';

type Props = {
  children: React.ReactNode;
};

/**
 * Warm topographic gradient background with subtle contour line overlay.
 * Used on Home and Daily Log screens.
 */
export default function GradientBackground({ children }: Props) {
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#F5A962', '#E8725A', '#C2553F', '#7a3020']}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* Subtle topographic contour lines */}
      <Svg
        style={styles.contours}
        viewBox="0 0 400 800"
        preserveAspectRatio="xMidYMid slice"
      >
        <Path
          d="M0 200 Q100 180 200 220 Q300 260 400 200"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={1.5}
          fill="none"
        />
        <Path
          d="M0 320 Q80 290 180 340 Q280 390 400 310"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={1.5}
          fill="none"
        />
        <Path
          d="M0 460 Q120 420 220 470 Q320 520 400 440"
          stroke="rgba(255,255,255,0.07)"
          strokeWidth={1.5}
          fill="none"
        />
        <Path
          d="M0 580 Q90 560 200 600 Q310 640 400 570"
          stroke="rgba(255,255,255,0.05)"
          strokeWidth={1.5}
          fill="none"
        />
        <Path
          d="M0 700 Q140 670 250 720 Q350 760 400 690"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={1.5}
          fill="none"
        />
      </Svg>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contours: {
    ...StyleSheet.absoluteFillObject,
    opacity: 1,
  },
});
