import React, { useCallback, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import Svg, { Path, Circle, Defs, LinearGradient as SvgGradient, Stop, Line } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';

import { colors, severity as severityColors, spacing, radius, getSymptomColor } from '../theme';
import { loadAllLogs, loadSettings } from '../storage';
import { AppSettings, DailyLog, SeverityLevel } from '../types';
import { usePremium } from '../purchases/usePremium';
import SymptomIcon from '../components/SymptomIcon';
import CreamBackground from '../components/CreamBackground';
import GlassCard from '../components/GlassCard';
import CoralButton from '../components/CoralButton';
import EbbText from '../components/EbbText';

type Range = '7D' | '30D' | '90D' | 'All';
const RANGES: Range[] = ['7D', '30D', '90D', 'All'];
const RANGE_LABELS: Record<Range, string> = { '7D': 'Week', '30D': 'Month', '90D': '3 Months', 'All': 'All' };

function daysAgoDateString(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-');
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function parseDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/**
 * Generate x-axis labels modeled after Apple Health:
 * - Week (7D): 3-letter day names for each of the 7 days
 * - Month (30D): day-of-month numbers, evenly spaced (~5 labels)
 * - 3 Months (90D): unique month names across the range
 * - All: unique month names, with year suffix if spanning multiple years
 */
function getXAxisLabels(dates: string[], range: Range): string[] {
  if (dates.length === 0) return [];
  if (dates.length === 1) {
    // Single date — just show it
    const d = parseDate(dates[0]);
    return [range === '7D' ? DAY_NAMES[d.getDay()] : `${MONTH_NAMES[d.getMonth()]} ${d.getDate()}`];
  }

  switch (range) {
    case '7D': {
      // One label per day, 3-letter day name
      return dates.map((d) => DAY_NAMES[parseDate(d).getDay()]);
    }
    case '30D': {
      // ~5 evenly spaced labels showing day-of-month number
      const count = Math.min(5, dates.length);
      return Array.from({ length: count }, (_, i) => {
        const idx = Math.round((i / (count - 1)) * (dates.length - 1));
        const d = parseDate(dates[idx]);
        return String(d.getDate());
      });
    }
    case '90D':
    case 'All': {
      // Collect unique months in order, show abbreviated month name
      const firstDate = parseDate(dates[0]);
      const lastDate = parseDate(dates[dates.length - 1]);
      const multiYear = firstDate.getFullYear() !== lastDate.getFullYear();

      const seen = new Set<string>();
      const uniqueMonths: { label: string; index: number }[] = [];
      dates.forEach((dateStr, i) => {
        const d = parseDate(dateStr);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        if (!seen.has(key)) {
          seen.add(key);
          const name = MONTH_NAMES[d.getMonth()];
          const label = multiYear ? `${name} '${String(d.getFullYear()).slice(2)}` : name;
          uniqueMonths.push({ label, index: i });
        }
      });

      // If too many months, evenly sample ~5-6
      if (uniqueMonths.length <= 6) return uniqueMonths.map((m) => m.label);
      const maxLabels = 6;
      return Array.from({ length: maxLabels }, (_, i) => {
        const idx = Math.round((i / (maxLabels - 1)) * (uniqueMonths.length - 1));
        return uniqueMonths[idx].label;
      });
    }
  }
}

function rangeToDays(range: Range): number {
  switch (range) {
    case '7D': return 7;
    case '30D': return 30;
    case '90D': return 90;
    case 'All': return 9999;
  }
}

const CHART_H = 60;
const CHART_PAD = 8; // horizontal inset so edge dots aren't clipped

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
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  // Chart fills the card: screen - content padding (md*2) - card padding (lg*2)
  const CHART_W = screenWidth - spacing.md * 2 - spacing.lg * 2;

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

  // Generate dates only for the range that has data, not empty space
  const maxDays = rangeToDays(range);
  const allDatesInRange = Array.from({ length: Math.min(maxDays, 365) }, (_, i) => daysAgoDateString(Math.min(maxDays, 365) - 1 - i));

  // Find the earliest date that has a log within this range
  const firstLoggedIdx = allDatesInRange.findIndex((d) => logMap.has(d));
  // Trim to only show from the first logged date to today
  const dates = firstLoggedIdx >= 0 ? allDatesInRange.slice(firstLoggedIdx) : allDatesInRange;

  function getSeverity(symptomId: string, date: string): SeverityLevel | null {
    const log = logMap.get(date);
    if (!log) return null;
    const entry = log.entries.find((e) => e.symptomId === symptomId);
    return entry ? entry.severity : null;
  }

  const hasAnyLogs = logMap.size > 0;
  const needsPremium = !premium && (range === '30D' || range === '90D' || range === 'All');

  return (
    <CreamBackground>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <EbbText type="largeTitle" style={styles.title}>Trends</EbbText>
          {!premium && (
            <EbbText type="footnote" style={styles.subtitle}>
              Last 7 days {'\u00B7'} <EbbText type="footnote" style={styles.premiumLink} onPress={() => router.push('/paywall')}>Unlock history with Premium</EbbText>
            </EbbText>
          )}
        </View>

        {/* Range toggle */}
        <GlassCard variant="cream" style={styles.toggleCard}>
          <View style={styles.toggleRow}>
            {RANGES.map((r) => {
              const isActive = range === r;
              return (
                <Pressable
                  key={r}
                  style={styles.togglePill}
                  onPress={() => setRange(r)}
                >
                  {isActive ? (
                    <LinearGradient
                      colors={['#E8725A', '#C2553F']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.togglePillActive}
                    >
                      <EbbText type="footnote" style={styles.toggleTextActive}>{RANGE_LABELS[r]}</EbbText>
                    </LinearGradient>
                  ) : (
                    <View style={styles.togglePillInactive}>
                      <EbbText type="footnote" style={styles.toggleText}>{RANGE_LABELS[r]}</EbbText>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        </GlassCard>

        {needsPremium ? (
          <GlassCard variant="cream" style={styles.paywallCard}>
            <View style={styles.paywallContent}>
              <GlassCard variant="cream" style={styles.paywallIconCard}>
                <View style={styles.paywallIconWrap}>
                  <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
                    <Line x1="3" y1="20" x2="7" y2="12" stroke={colors.primary} strokeWidth={2} strokeLinecap="round" />
                    <Line x1="7" y1="12" x2="12" y2="16" stroke={colors.primary} strokeWidth={2} strokeLinecap="round" />
                    <Line x1="12" y1="16" x2="17" y2="8" stroke={colors.primary} strokeWidth={2} strokeLinecap="round" />
                    <Line x1="17" y1="8" x2="21" y2="4" stroke={colors.primary} strokeWidth={2} strokeLinecap="round" />
                  </Svg>
                </View>
              </GlassCard>
              <EbbText type="headline" style={styles.paywallTitle}>Unlock full history</EbbText>
              <EbbText type="body" style={styles.paywallSub}>See all your trends over time</EbbText>
              <CoralButton label="Try Premium Free for 14 days" onPress={() => router.push('/paywall')} style={styles.paywallBtn} />
            </View>
          </GlassCard>
        ) : !hasAnyLogs ? (
          <View style={styles.empty}>
            <GlassCard variant="cream" style={styles.emptyIconCard}>
              <View style={styles.emptyIconWrap}>
                <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
                  <Line x1="3" y1="20" x2="7" y2="12" stroke={colors.primary} strokeWidth={2} strokeLinecap="round" />
                  <Line x1="7" y1="12" x2="12" y2="16" stroke={colors.primary} strokeWidth={2} strokeLinecap="round" />
                  <Line x1="12" y1="16" x2="17" y2="8" stroke={colors.primary} strokeWidth={2} strokeLinecap="round" />
                  <Line x1="17" y1="8" x2="21" y2="4" stroke={colors.primary} strokeWidth={2} strokeLinecap="round" />
                </Svg>
              </View>
            </GlassCard>
            <EbbText type="headline" style={styles.emptyTitle}>No data yet</EbbText>
            <EbbText type="body" style={styles.emptyText}>
              Log a few days to see your trends here
            </EbbText>
          </View>
        ) : settings.symptoms.length === 0 ? (
          <View style={styles.empty}>
            <EbbText type="body" style={styles.emptyText}>Add symptoms in Settings to see trends.</EbbText>
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
                x: dates.length > 1
                  ? CHART_PAD + (p.index / (dates.length - 1)) * (CHART_W - CHART_PAD * 2)
                  : CHART_W / 2,
                y: CHART_PAD + (1 - (p.severity - 1) / 4) * (CHART_H - CHART_PAD * 2),
              }));

              const { linePath, areaPath } = buildAreaPath(svgPoints, CHART_W, CHART_H - CHART_PAD);

              // Use symptom's unique color for the chart
              const chartColor = getSymptomColor(symptom.name);

              // X-axis labels based on selected range
              const xLabels = getXAxisLabels(dates, range);

              return (
                <GlassCard key={symptom.id} variant="cream" style={styles.card}>
                  <View style={styles.cardPad}>
                    <View style={styles.cardHeader}>
                      <SymptomIcon name={symptom.name} size={18} color={chartColor} showBox boxSize={32} />
                      <EbbText type="headline" style={[styles.symptomName, { color: chartColor }]}>{symptom.name}</EbbText>
                      <View style={styles.avgBadge}>
                        <EbbText type="caption" style={styles.avgText}>avg {avg}</EbbText>
                      </View>
                    </View>

                    {/* Area chart */}
                    <View style={styles.chartContainer}>
                      <Svg width={CHART_W} height={CHART_H} viewBox={`0 0 ${CHART_W} ${CHART_H}`}>
                        <Defs>
                          <SvgGradient id={`grad-${symptom.id}`} x1="0" y1="0" x2="0" y2="1">
                            <Stop offset="0%" stopColor={chartColor} stopOpacity={0.35} />
                            <Stop offset="100%" stopColor={chartColor} stopOpacity={0.05} />
                          </SvgGradient>
                        </Defs>
                        {/* Gridlines at severity 1, 3, 5 */}
                        {[1, 3, 5].map((sev) => {
                          const y = CHART_PAD + (1 - (sev - 1) / 4) * (CHART_H - CHART_PAD * 2);
                          return (
                            <Line
                              key={`grid-${sev}`}
                              x1={0}
                              y1={y}
                              x2={CHART_W}
                              y2={y}
                              stroke="rgba(0,0,0,0.06)"
                              strokeWidth={1}
                              strokeDasharray="4,4"
                            />
                          );
                        })}
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
                            {/* Data point dots with severity labels */}
                            {svgPoints.map((pt, idx) => (
                              <Circle
                                key={idx}
                                cx={pt.x}
                                cy={pt.y}
                                r={idx === svgPoints.length - 1 ? 4 : 2.5}
                                fill={idx === svgPoints.length - 1 ? '#FFFFFF' : chartColor}
                                stroke={chartColor}
                                strokeWidth={idx === svgPoints.length - 1 ? 2 : 0}
                              />
                            ))}
                          </>
                        ) : null}
                      </Svg>
                    </View>

                    {/* X-axis labels */}
                    <View style={styles.xLabels}>
                      {xLabels.map((label, i) => (
                        <EbbText key={i} type="footnote" style={[
                          styles.xLabel,
                          i === xLabels.length - 1 && styles.xLabelToday,
                        ]}>
                          {label}
                        </EbbText>
                      ))}
                    </View>

                    {/* Legend */}
                    <View style={styles.legend}>
                      {severityColors.map((col, i) => (
                        <View key={i} style={styles.legendItem}>
                          <EbbText type="footnote" style={styles.legendNum}>{i + 1}</EbbText>
                          <View style={[styles.legendDot, { backgroundColor: col }]} />
                        </View>
                      ))}
                    </View>
                  </View>
                </GlassCard>
              );
            })}
            <View style={{ height: 100 }} />
          </ScrollView>
        )}
      </SafeAreaView>
    </CreamBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  title: {
    color: colors.text,
  },
  subtitle: {
    color: colors.textMuted,
    marginTop: 2,
  },
  premiumLink: {
    color: colors.primary,
  },

  // Range toggle
  toggleCard: {
    marginHorizontal: spacing.md,
    marginVertical: spacing.md,
  },
  toggleRow: {
    flexDirection: 'row',
    padding: 3,
  },
  togglePill: {
    flex: 1,
    minHeight: 44,
    justifyContent: 'center',
  },
  togglePillActive: {
    minHeight: 44,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  togglePillInactive: {
    minHeight: 44,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleText: {
    fontWeight: '600',
    color: colors.textMuted,
  },
  toggleTextActive: {
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Content
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  card: {
    marginBottom: spacing.md,
  },
  cardPad: {
    padding: spacing.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  symptomName: {
    flex: 1,
  },
  avgBadge: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
  },
  avgText: {
    fontWeight: '700',
    color: colors.primaryDark,
  },

  // Chart
  chartContainer: {
    marginBottom: spacing.xs,
  },
  xLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xs,
  },
  xLabel: {
    color: colors.textMuted,
  },
  xLabelToday: {
    color: colors.primary,
    fontWeight: '700',
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
  emptyIconCard: {
    marginBottom: spacing.md,
  },
  emptyIconWrap: {
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    color: colors.text,
    marginBottom: spacing.sm,
  },
  emptyText: {
    color: colors.textMuted,
    textAlign: 'center',
  },

  // Paywall
  paywallCard: {
    margin: spacing.lg,
  },
  paywallContent: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  paywallIconCard: {
    marginBottom: spacing.md,
  },
  paywallIconWrap: {
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paywallTitle: {
    color: colors.text,
    marginBottom: spacing.xs,
  },
  paywallSub: {
    color: colors.textMuted,
    marginBottom: spacing.lg,
  },
  paywallBtn: {
    width: '100%',
  },
});
