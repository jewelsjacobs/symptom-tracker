import React from 'react';
import { StyleSheet, View, Pressable } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import Svg, { Path, Rect, Line, Circle } from 'react-native-svg';
import { colors, spacing } from '../theme';
import EbbText from './EbbText';

const ICON_SIZE = 20;
const STROKE = 1.5;

export default function BottomNav({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrapper, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      <BlurView intensity={95} tint="light" style={styles.pill}>
        <View style={styles.inner}>
          {state.routes.map((route, index) => {
            const focused = state.index === index;
            const color = focused ? '#E8725A' : '#7A706B';
            const label = getLabel(route.name);

            return (
              <Pressable
                key={route.key}
                onPress={() => {
                  const event = navigation.emit({
                    type: 'tabPress',
                    target: route.key,
                    canPreventDefault: true,
                  });
                  if (!focused && !event.defaultPrevented) {
                    navigation.navigate(route.name);
                  }
                }}
                style={styles.tab}
                accessibilityRole="button"
                accessibilityState={{ selected: focused }}
                accessibilityLabel={label}
              >
                <NavIcon name={route.name} focused={focused} color={color} />
                <EbbText type="caption" style={[styles.label, { color }]}>{label}</EbbText>
                {focused && <View style={styles.dot} />}
              </Pressable>
            );
          })}
        </View>
      </BlurView>
    </View>
  );
}

function getLabel(routeName: string): string {
  switch (routeName) {
    case 'home': return 'Home';
    case 'history': return 'History';
    case 'trends': return 'Trends';
    case 'settings': return 'Settings';
    default: return routeName;
  }
}

function NavIcon({ name, focused, color }: { name: string; focused: boolean; color: string }) {
  const props = { width: ICON_SIZE, height: ICON_SIZE, viewBox: '0 0 20 20' };

  switch (name) {
    case 'home':
      return focused ? (
        <Svg {...props}>
          <Path
            d="M3 8.5 L10 2.5 L17 8.5 V16.5 C17 17.05 16.55 17.5 16 17.5 H4 C3.45 17.5 3 17.05 3 16.5 Z"
            fill={color}
            stroke={color}
            strokeWidth={STROKE}
            strokeLinejoin="round"
          />
        </Svg>
      ) : (
        <Svg {...props}>
          <Path
            d="M3 8.5 L10 2.5 L17 8.5 V16.5 C17 17.05 16.55 17.5 16 17.5 H4 C3.45 17.5 3 17.05 3 16.5 Z"
            stroke={color}
            strokeWidth={STROKE}
            fill="none"
            strokeLinejoin="round"
          />
        </Svg>
      );

    case 'history':
      return focused ? (
        <Svg {...props}>
          <Rect x={3} y={3} width={14} height={14} rx={2} fill={color} stroke={color} strokeWidth={STROKE} />
          <Line x1={3} y1={7.5} x2={17} y2={7.5} stroke="white" strokeWidth={STROKE} />
          <Line x1={7} y1={3} x2={7} y2={7.5} stroke="white" strokeWidth={STROKE} />
          <Line x1={13} y1={3} x2={13} y2={7.5} stroke="white" strokeWidth={STROKE} />
        </Svg>
      ) : (
        <Svg {...props}>
          <Rect x={3} y={3} width={14} height={14} rx={2} stroke={color} strokeWidth={STROKE} fill="none" />
          <Line x1={3} y1={7.5} x2={17} y2={7.5} stroke={color} strokeWidth={STROKE} />
          <Line x1={7} y1={3} x2={7} y2={7.5} stroke={color} strokeWidth={STROKE} />
          <Line x1={13} y1={3} x2={13} y2={7.5} stroke={color} strokeWidth={STROKE} />
        </Svg>
      );

    case 'trends':
      return (
        <Svg {...props}>
          <Path
            d="M3 15 L6 10 Q8 7 10 9 Q12 11 14 6 L17 3"
            stroke={color}
            strokeWidth={STROKE}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {focused && (
            <Path
              d="M3 15 L6 10 Q8 7 10 9 Q12 11 14 6 L17 3 V17 H3 Z"
              fill={color}
              opacity={0.2}
            />
          )}
        </Svg>
      );

    case 'settings':
      return (
        <Svg {...props}>
          <Line x1={4} y1={5} x2={16} y2={5} stroke={color} strokeWidth={STROKE} strokeLinecap="round" />
          <Circle cx={8} cy={5} r={1.8} fill={focused ? color : 'none'} stroke={color} strokeWidth={STROKE} />
          <Line x1={4} y1={10} x2={16} y2={10} stroke={color} strokeWidth={STROKE} strokeLinecap="round" />
          <Circle cx={13} cy={10} r={1.8} fill={focused ? color : 'none'} stroke={color} strokeWidth={STROKE} />
          <Line x1={4} y1={15} x2={16} y2={15} stroke={color} strokeWidth={STROKE} strokeLinecap="round" />
          <Circle cx={10} cy={15} r={1.8} fill={focused ? color : 'none'} stroke={color} strokeWidth={STROKE} />
        </Svg>
      );

    default:
      return null;
  }
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  pill: {
    borderRadius: 100,
    overflow: 'hidden',
    width: '100%',
    maxWidth: 340,
  },
  inner: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 100,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
    minHeight: 44,
    minWidth: 60,
  },
  label: {
    marginTop: 2,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E8725A',
    marginTop: 3,
  },
});
