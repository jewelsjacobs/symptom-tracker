import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Path, Circle, Rect, Line } from 'react-native-svg';

type Props = {
  name: string;
  size?: number;
  color?: string;
  /** Wrap icon in a rounded box with semi-transparent background */
  showBox?: boolean;
};

const STROKE_WIDTH = 1.4;

/**
 * Custom SVG symptom icons. Maps symptom name (case-insensitive) to an icon.
 * Falls back to adjustable-sliders icon for unrecognized names.
 */
export default function SymptomIcon({
  name,
  size = 16,
  color = '#FFFFFF',
  showBox = false,
}: Props) {
  const icon = renderIcon(name.toLowerCase(), size, color);

  if (!showBox) return icon;

  return (
    <View style={styles.box}>
      {icon}
    </View>
  );
}

function renderIcon(name: string, size: number, color: string) {
  const props = { width: size, height: size, viewBox: '0 0 16 16' };

  // Pain / waveform
  if (name.includes('pain') && !name.includes('joint')) {
    return (
      <Svg {...props}>
        <Path
          d="M1 8 L3 4 L5 11 L7 3 L9 12 L11 5 L13 9 L15 8"
          stroke={color}
          strokeWidth={STROKE_WIDTH}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    );
  }

  // Fatigue / battery
  if (name.includes('fatigue') || name.includes('energy')) {
    return (
      <Svg {...props}>
        <Rect x={2} y={4} width={10} height={8} rx={1.5} stroke={color} strokeWidth={STROKE_WIDTH} fill="none" />
        <Rect x={12} y={6} width={2} height={4} rx={0.5} stroke={color} strokeWidth={STROKE_WIDTH} fill="none" />
        <Rect x={3.5} y={6} width={3} height={4} rx={0.5} fill={color} />
      </Svg>
    );
  }

  // Brain Fog / cloud with rain
  if (name.includes('brain') || name.includes('fog') || name.includes('cognitive')) {
    return (
      <Svg {...props}>
        <Path
          d="M4 10 Q2 10 2 8.5 Q2 7 3.5 6.5 Q3.5 4.5 6 4.5 Q7.5 3.5 9 4.5 Q10 3.8 11.5 4.5 Q13.5 5 13.5 7 Q14.5 7.5 14 9 Q13.5 10 12 10 Z"
          stroke={color}
          strokeWidth={STROKE_WIDTH}
          fill="none"
          strokeLinejoin="round"
        />
        <Circle cx={6} cy={12.5} r={0.6} fill={color} />
        <Circle cx={8.5} cy={13} r={0.6} fill={color} />
        <Circle cx={11} cy={12.5} r={0.6} fill={color} />
      </Svg>
    );
  }

  // Nausea / wavy lines
  if (name.includes('nausea') || name.includes('stomach')) {
    return (
      <Svg {...props}>
        <Path d="M2 5 Q4 3.5 6 5 Q8 6.5 10 5 Q12 3.5 14 5" stroke={color} strokeWidth={STROKE_WIDTH} fill="none" strokeLinecap="round" />
        <Path d="M2 8 Q4 6.5 6 8 Q8 9.5 10 8 Q12 6.5 14 8" stroke={color} strokeWidth={STROKE_WIDTH} fill="none" strokeLinecap="round" />
        <Path d="M2 11 Q4 9.5 6 11 Q8 12.5 10 11 Q12 9.5 14 11" stroke={color} strokeWidth={STROKE_WIDTH} fill="none" strokeLinecap="round" />
      </Svg>
    );
  }

  // Headache / lightning
  if (name.includes('headache') || name.includes('migraine')) {
    return (
      <Svg {...props}>
        <Path
          d="M9.5 1.5 L6 7 L9 7 L5.5 14.5 L8 9 L5 9 L9.5 1.5"
          stroke={color}
          strokeWidth={STROKE_WIDTH}
          fill="none"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </Svg>
    );
  }

  // Anxiety / spiral
  if (name.includes('anxiety') || name.includes('stress')) {
    return (
      <Svg {...props}>
        <Path
          d="M8 9 Q6.5 9 6.5 7.5 Q6.5 6 8 6 Q10 6 10 8 Q10 10.5 7.5 10.5 Q4.5 10.5 4.5 7.5 Q4.5 4 8 4 Q12 4 12 8 Q12 12 8 12.5"
          stroke={color}
          strokeWidth={STROKE_WIDTH}
          fill="none"
          strokeLinecap="round"
        />
      </Svg>
    );
  }

  // Dizziness / circular arrows
  if (name.includes('dizz') || name.includes('vertigo')) {
    return (
      <Svg {...props}>
        <Path
          d="M11.5 4.5 A4.5 4.5 0 0 1 12.5 8"
          stroke={color}
          strokeWidth={STROKE_WIDTH}
          fill="none"
          strokeLinecap="round"
        />
        <Path d="M12.5 8 L13.5 6.5 M12.5 8 L11 7" stroke={color} strokeWidth={STROKE_WIDTH} strokeLinecap="round" />
        <Path
          d="M4.5 11.5 A4.5 4.5 0 0 1 3.5 8"
          stroke={color}
          strokeWidth={STROKE_WIDTH}
          fill="none"
          strokeLinecap="round"
        />
        <Path d="M3.5 8 L2.5 9.5 M3.5 8 L5 9" stroke={color} strokeWidth={STROKE_WIDTH} strokeLinecap="round" />
      </Svg>
    );
  }

  // Joint Pain / two connected circles
  if (name.includes('joint')) {
    return (
      <Svg {...props}>
        <Circle cx={5.5} cy={5.5} r={3} stroke={color} strokeWidth={STROKE_WIDTH} fill="none" />
        <Circle cx={10.5} cy={10.5} r={3} stroke={color} strokeWidth={STROKE_WIDTH} fill="none" />
        <Line x1={7.5} y1={7.5} x2={8.5} y2={8.5} stroke={color} strokeWidth={STROKE_WIDTH} strokeLinecap="round" />
      </Svg>
    );
  }

  // Sleep Quality / crescent moon
  if (name.includes('sleep') || name.includes('insomnia')) {
    return (
      <Svg {...props}>
        <Path
          d="M10 2.5 A5 5 0 1 0 13 6 A3.5 3.5 0 0 1 10 2.5"
          stroke={color}
          strokeWidth={STROKE_WIDTH}
          fill="none"
          strokeLinejoin="round"
        />
      </Svg>
    );
  }

  // Mood / signal bars
  if (name.includes('mood') || name.includes('depress')) {
    return (
      <Svg {...props}>
        <Rect x={2} y={11} width={2} height={3} rx={0.5} fill={color} />
        <Rect x={5.5} y={9} width={2} height={5} rx={0.5} fill={color} />
        <Rect x={9} y={6} width={2} height={8} rx={0.5} fill={color} />
        <Rect x={12.5} y={3} width={2} height={11} rx={0.5} fill={color} />
      </Svg>
    );
  }

  // Default / custom — adjustable sliders
  return (
    <Svg {...props}>
      <Line x1={3} y1={4} x2={13} y2={4} stroke={color} strokeWidth={STROKE_WIDTH} strokeLinecap="round" />
      <Circle cx={6} cy={4} r={1.5} fill={color} />
      <Line x1={3} y1={8} x2={13} y2={8} stroke={color} strokeWidth={STROKE_WIDTH} strokeLinecap="round" />
      <Circle cx={10} cy={8} r={1.5} fill={color} />
      <Line x1={3} y1={12} x2={13} y2={12} stroke={color} strokeWidth={STROKE_WIDTH} strokeLinecap="round" />
      <Circle cx={7.5} cy={12} r={1.5} fill={color} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  box: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
