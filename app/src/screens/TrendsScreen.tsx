import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Svg, { Path, Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';

import { colors, severity as severityColors, spacing, fontSize, radius } from '../theme';
import { loadAllLogs, loadSettings } from '../storage';
import { AppSettings, DailyLog, SeverityLevel } from '../types';
import { usePremium } from '../purchases/usePremium';
import SymptomIcon from '../components/SymptomIcon';

type Range = '7D' | '30D' | '90D' | 'All';
const RANGES: Range[] = ['7D', '30D', '90D', 'All'];

function daysAgoDateString(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-');
}

function dayInitial(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  return ['S', 'M', 'T', 'W', 'T', 'F', 'S'][d.getDay()];
}

function rangeToDays(range: Range): number {
  switch (range) {
    case '7D': return 7;
    case '30D': return 30;
    case '90D': return 90;
    case 'All': return 9999;
  }
}

const CHART_W = 280;
const CHART_H = 60;

/** Build a smooth SVG area path from data points */
function buildAreaPath(
  points: { x: number; y: number }[],
  width: number,
  height: number,
): { linePath: string; areaPath: string } {
  if (points.length === 0) return { linePath: '', areaPath: '' };
  if (points.length === 1) {
    const p = points[0];
    return {
      linePath: `M${p.x} ${p.y}`,
      areaPath: `M${p.x} ${height} L${p.x} ${p.y} L${p.x} ${height} Z`,
    };
  }

  // Build cubic bezier through points
  let line = `M${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const cpx = (prev.x + curr.x) / 2;
    line += ` C${cpx} ${prev.y}, ${cpx} ${curr.y}, ${curr.x} ${curr.y}`;
  }

  const lastX = points[points.length - 1].x;
  const firstX = points[0].x;
  const area = `${line} L${lastX} ${height} L${firstX} ${height} Z`;

  return { linePath: line, areaPath: area };
}

export default function TrendsScreen() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [logMap, setLogMap] = useState<Map<string, DailyLog>>(new Map());
  const [range, setRange] = useState<Range>('7D');
  const { premium } = usePremium();

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const [s, logs] = await Promise.all([loadSettings(), loadAllLogs()]);
        setSettings(s);
        const map = new Map<string, DailyLog>();
        for (const log of logs) map.set(log.date, log);
        setLogMap(map);
      })();
    }, [])
  );

  if (!settings) return null;

  const days = rangeToDays(range);
  const dates = Array.from({ length: Math.min(days, 365) }, (_, i) => daysAgoDateString(Math.min(days, 365) - 1 - i));

  function getSeverity(symptomId: string, date: string): SeverityLevel | null {
    const log = logMap.get(date);
    if (!log) return null;
    const entry = log.entries.find((e) => e.symptomId === symptomId);
    return entry ? entry.severity : null;
  }

  const hasAnyLogs = logMap.size > 0;
  const needsPremium = !premium && (range === '30D' || range === '90D' || range === 'All');

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Trends</Text>
        {!premium && (
          <Text style={styles.subtitle}>
            Last 7 days{' '}
            <Text style={styles.premiumLink}>Unlock history with Premium</Text>
          </Text>
        )}
      </View>

      {/* Range toggle */}
      <View style={styles.toggleRow}>
        {RANGES.map((r) => (
          <Pressable
            key={r}
            style={[styles.togglePill, range === r && styles.togglePillActive]}
            onPress={() => setRange(r)}
          >
            <Text style={[styles.toggleText, range === r && styles.toggleTextActive]}>
              {r}
            </Text>
          </Pressable>
        ))}
      </View>

      {needsPremium ? (
        <View style={styles.paywallCard}>
          <Text style={styles.paywallTitle}>Unlock full history</Text>
          <Text style={styles.paywallSub}>See all your trends over time</Text>
          <Pressable style={styles.paywallButton}>
            <Text style={styles.paywallButtonText}>Try Premium Free for 14 days</Text>
          </Pressable>
        </View>
      ) : !hasAnyLogs ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No data yet</Text>
          <Text style={styles.emptyText}>
            Log a few days to see your trends here
          </Text>
        </View>
      ) : settings.symptoms.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Add symptoms in Settings to see trends.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {settings.symptoms.map((symptom) => {
            // Collect data points (only dates with data)
            const dataPoints: { index: number; severity: number }[] = [];
            dates.forEach((date, i) => {
              const sev = getSeverity(symptom.id, date);
              if (sev !== null) dataPoints.push({ index: i, severity: sev });
            });

            const filled = dataPoints.map((p) => p.severity);
            const avg = filled.length > 0
              ? (filled.reduce((s, v) => s + v, 0) / filled.length).toFixed(1)
              : '\u2014';

            // Map to SVG coordinates
            const svgPoints = dataPoints.map((p) => ({
              x: dates.length > 1 ? (p.index / (dates.length - 1)) * CHART_W : CHART_W / 2,
              y: CHART_H - ((p.severity - 1) / 4) * CHART_H,
            }));

            const { linePath, areaPath } = buildAreaPath(svgPoints, CHART_W, CHART_H);

            // Determine dominant color from average
            const avgNum = parseFloat(avg) || 3;
            const colorIdx = Math.max(0, Math.min(4, Math.round(avgNum) - 1));
            const chartColor = severityColors[colorIdx];

            // Day labels for x-axis
            const labelCount = Math.min(7, dates.length);
            const labelIndices = Array.from({ length: labelCount }, (_, i) =>
              Math.round((i / (labelCount - 1)) * (dates.length - 1))
            );

            return (
              <View key={symptom.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <SymptomIcon name={symptom.name} size={14} color={colors.text} showBox />
                  <Text style={styles.symptomName}>{symptom.name}</Text>
                  <View style={styles.avgBadge}>
                    <Text style={styles.avgText}>avg {avg}</Text>
                  </View>
                </View>

                {/* Area chart */}
                <View style={styles.chartContainer}>
                  <Svg width={CHART_W} height={CHART_H + 4} viewBox={`0 -2 ${CHART_W} ${CHART_H + 4}`}>
                    <Defs>
                      <SvgGradient id={`grad-${symptom.id}`} x1="0" y1="0" x2="0" y2="1">
                        <Stop offset="0%" stopColor={chartColor} stopOpacity={0.35} />
                        <Stop offset="100%" stopColor={chartColor} stopOpacity={0.05} />
                      </SvgGradient>
                    </Defs>
                    {areaPath ? (
                      <>
                        <Path d={areaPath} fill={`url(#grad-${symptom.id})`} />
                        <Path
                          d={linePath}
                          stroke={chartColor}
                          strokeWidth={2}
                          fill="none"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        {/* Today dot */}
                        {svgPoints.length > 0 && (
                          <Circle
                            cx={svgPoints[svgPoints.length - 1].x}
                            cy={svgPoints[svgPoints.length - 1].y}
                            r={4}
                            fill="#FFFFFF"
                            stroke={chartColor}
                            strokeWidth={2}
                          />
                        )}
                      </>
                    ) : null}
                  </Svg>
                </View>

                {/* X-axis labels */}
                <View style={styles.xLabels}>
                  {labelIndices.map((idx) => (
                    <Text key={idx} style={[
                      styles.xLabel,
                      idx === dates.length - 1 && styles.xLabelToday,
                    ]}>
                      {dayInitial(dates[idx])}
                    </Text>
                  ))}
                </View>

                {/* Legend */}
                <View style={styles.legend}>
                  {severityColors.map((col, i) => (
                    <View key={i} style={styles.legendItem}>
                      <Text style={styles.legendNum}>{i + 1}</Text>
                      <View style={[styles.legendDot, { backgroundColor: col }]} />
                    </View>
                  ))}
                </View>
              </View>
            );
          })}
          <View style={{ height: 100 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  title: {
    fontFamily: 'DMSans_700Bold',
    fontSize: fontSize.xxl,
    color: colors.text,
  },
  subtitle: {
    fontFamily: 'DMSans_400Regular',
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: 2,
  },
  premiumLink: {
    color: colors.primary,
  },

  // Range toggle
  toggleRow: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginVertical: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    padding: 3,
  },
  togglePill: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    alignItems: 'center',
  },
  togglePillActive: {
    backgroundColor: colors.primary,
  },
  toggleText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  toggleTextActive: {
    color: '#FFFFFF',
  },

  // Content
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  symptomName: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: fontSize.lg,
    color: colors.text,
    flex: 1,
  },
  avgBadge: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
  },
  avgText: {
    fontFamily: 'DMSans_700Bold',
    fontSize: fontSize.xs,
    color: colors.primaryDark,
  },

  // Chart
  chartContainer: {
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  xLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xs,
  },
  xLabel: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 10,
    color: colors.textMuted,
  },
  xLabelToday: {
    color: colors.primary,
    fontFamily: 'DMSans_700Bold',
  },

  // Legend
  legend: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 6,
    marginTop: spacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  legendNum: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 10,
    color: colors.textMuted,
  },
  legendDot: { width: 8, height: 8, borderRadius: 4 },

  // Empty
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyTitle: {
    fontFamily: 'DMSans_700Bold',
    fontSize: fontSize.xl,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: fontSize.md,
    color: colors.textMuted,
    textAlign: 'center',
  },

  // Paywall
  paywallCard: {
    margin: spacing.lg,
    padding: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 4,
  },
  paywallTitle: {
    fontFamily: 'DMSans_700Bold',
    fontSize: fontSize.xl,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  paywallSub: {
    fontFamily: 'DMSans_400Regular',
    fontSize: fontSize.md,
    color: colors.textMuted,
    marginBottom: spacing.lg,
  },
  paywallButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  paywallButtonText: {
    fontFamily: 'DMSans_700Bold',
    fontSize: fontSize.md,
    color: '#FFFFFF',
  },
});
