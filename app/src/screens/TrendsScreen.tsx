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

type AggregatedPoint = { index: number; severity: number; min: number; max: number; label: string; firstDate: string; lastDate: string };

/**
 * Aggregate daily data points into weekly or monthly buckets.
 * Returns avg, min, max severity per bucket for range band visualization.
 */
function aggregateDataPoints(
  dates: string[],
  getSev: (date: string) => SeverityLevel | null,
  mode: 'weekly' | 'monthly',
  multiYear: boolean,
): AggregatedPoint[] {
  if (dates.length === 0) return [];

  const buckets: Map<string, { severities: number[]; index: number; firstDate: string; lastDate: string }> = new Map();
  const bucketOrder: string[] = [];

  dates.forEach((dateStr, i) => {
    const sev = getSev(dateStr);
    if (sev === null) return;
    const d = parseDate(dateStr);
    let key: string;
    let label: string;

    if (mode === 'weekly') {
      const day = d.getDay();
      const monday = new Date(d);
      monday.setDate(d.getDate() - ((day + 6) % 7));
      key = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
      label = `${MONTH_NAMES[monday.getMonth()]} ${monday.getDate()}`;
    } else {
      key = `${d.getFullYear()}-${d.getMonth()}`;
      const name = MONTH_NAMES[d.getMonth()];
      label = multiYear ? `${name} '${String(d.getFullYear()).slice(2)}` : name;
    }

    if (!buckets.has(key)) {
      buckets.set(key, { severities: [], index: bucketOrder.length, firstDate: dateStr, lastDate: dateStr });
      bucketOrder.push(key);
    }
    const bucket = buckets.get(key)!;
    bucket.severities.push(sev);
    bucket.lastDate = dateStr;
  });

  return bucketOrder.map((key, i) => {
    const bucket = buckets.get(key)!;
    const avg = bucket.severities.reduce((s, v) => s + v, 0) / bucket.severities.length;
    return {
      index: i,
      severity: Math.round(avg * 10) / 10,
      min: Math.min(...bucket.severities),
      max: Math.max(...bucket.severities),
      label: '',
      firstDate: bucket.firstDate,
      lastDate: bucket.lastDate,
    };
  });
}

/** Get labels from aggregated points */
function getAggregatedLabels(
  dates: string[],
  getSev: (date: string) => SeverityLevel | null,
  mode: 'weekly' | 'monthly',
  multiYear: boolean,
): string[] {
  if (dates.length === 0) return [];

  const seen = new Set<string>();
  const labels: string[] = [];

  dates.forEach((dateStr) => {
    const sev = getSev(dateStr);
    if (sev === null) return;
    const d = parseDate(dateStr);
    let key: string;
    let label: string;

    if (mode === 'weekly') {
      const day = d.getDay();
      const monday = new Date(d);
      monday.setDate(d.getDate() - ((day + 6) % 7));
      key = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
      label = `${MONTH_NAMES[monday.getMonth()]} ${monday.getDate()}`;
    } else {
      key = `${d.getFullYear()}-${d.getMonth()}`;
      const name = MONTH_NAMES[d.getMonth()];
      label = multiYear ? `${name} '${String(d.getFullYear()).slice(2)}` : name;
    }

    if (!seen.has(key)) {
      seen.add(key);
      labels.push(label);
    }
  });

  // If too many labels, sample evenly
  if (labels.length <= 6) return labels;
  const max = 6;
  return Array.from({ length: max }, (_, i) => {
    const idx = Math.round((i / (max - 1)) * (labels.length - 1));
    return labels[idx];
  });
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
  // Tooltip state for month view: "symptomId-dataIndex" or null
  const [selectedDot, setSelectedDot] = useState<string | null>(null);
  const { premium } = usePremium();
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  // Chart fills the card: screen - content padding (md*2) - card padding (lg*2)
  const CHART_W = screenWidth - spacing.md * 2 - spacing.lg * 2;

  useFocusEffect(
    useCallback(() => {
      setSelectedDot(null); // Clear tooltip on focus
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

  // Generate dates for the selected range
  let maxDays = rangeToDays(range);

  // For 3 Months, calculate exact days to cover current month + 2 prior months
  if (range === '90D') {
    const now = new Date();
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1); // 1st of 2 months ago
    const diffMs = now.getTime() - threeMonthsAgo.getTime();
    maxDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  }

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
                  onPress={() => { setRange(r); setSelectedDot(null); }}
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
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} onScrollBeginDrag={() => setSelectedDot(null)}>
            {settings.symptoms.map((symptom) => {
              const getSev = (date: string) => getSeverity(symptom.id, date);

              // Check if dates span multiple years (for label formatting)
              const firstDate = dates.length > 0 ? parseDate(dates[0]) : new Date();
              const lastDate = dates.length > 0 ? parseDate(dates[dates.length - 1]) : new Date();
              const multiYear = firstDate.getFullYear() !== lastDate.getFullYear();

              // For 90D and All, aggregate into weekly/monthly averages
              // For 7D and 30D, use daily data points
              const useAggregation = range === '90D' || range === 'All';
              const aggMode = range === 'All' ? 'monthly' : 'weekly';

              let dataPoints: { index: number; severity: number }[];
              let xLabels: string[];
              let totalPoints: number;

              let aggData: AggregatedPoint[] = [];
              if (useAggregation) {
                aggData = aggregateDataPoints(dates, getSev, aggMode, multiYear);
                dataPoints = aggData.map((p, i) => ({ index: i, severity: p.severity }));
                // Both 90D and All use month-only labels (no week dates)
                xLabels = getAggregatedLabels(dates, getSev, 'monthly', multiYear);
                totalPoints = aggData.length;
              } else {
                dataPoints = [];
                dates.forEach((date, i) => {
                  const sev = getSev(date);
                  if (sev !== null) dataPoints.push({ index: i, severity: sev });
                });
                xLabels = getXAxisLabels(dates, range);
                totalPoints = dates.length;
              }

              const filled = dataPoints.map((p) => p.severity);
              const avgNum = filled.length > 0
                ? filled.reduce((s, v) => s + v, 0) / filled.length
                : 0;
              const avg = avgNum > 0 ? avgNum.toFixed(1) : '\u2014';
              const avgSevColor = avgNum > 0
                ? severityColors[Math.max(0, Math.min(4, Math.round(avgNum) - 1))]
                : colors.textMuted;

              // Map to SVG coordinates
              const svgPoints = dataPoints.map((p) => ({
                x: totalPoints > 1
                  ? CHART_PAD + (p.index / (totalPoints - 1)) * (CHART_W - CHART_PAD * 2)
                  : CHART_PAD,
                y: CHART_PAD + (1 - (p.severity - 1) / 4) * (CHART_H - CHART_PAD * 2),
              }));

              const { linePath, areaPath } = buildAreaPath(svgPoints, CHART_W, CHART_H - CHART_PAD);

              const symptomColor = getSymptomColor(symptom.name);
              // Neutral warm color for line and gradient — lets the colored dots tell the story
              const chartLineColor = '#B5ADA8';
              const chartFillColor = '#D5CFCA';

              return (
                <Pressable key={symptom.id} onPress={() => setSelectedDot(null)}>
                <GlassCard variant="cream" style={styles.card}>
                  <View style={styles.cardPad}>
                    <View style={styles.cardHeader}>
                      <SymptomIcon name={symptom.name} size={18} color={symptomColor} showBox boxSize={32} />
                      <EbbText type="headline" style={styles.symptomName}>{symptom.name}</EbbText>
                      <View style={[styles.avgBadge, { backgroundColor: avgSevColor + '20' }]}>
                        <EbbText type="caption" style={[styles.avgText, { color: avgSevColor }]}>avg {avg}</EbbText>
                      </View>
                    </View>

                    {/* Area chart */}
                    <Pressable style={styles.chartContainer} onPress={() => setSelectedDot(null)}>
                      {/* Tooltip for selected dot (30D, 90D, All views) */}
                      {range !== '7D' && selectedDot?.startsWith(symptom.id + '-') && (() => {
                        const dotIdx = parseInt(selectedDot.split('-').pop()!, 10);
                        const dp = dataPoints[dotIdx];
                        const pt = svgPoints[dotIdx];
                        if (!dp || !pt) return null;
                        const sevRounded = Math.max(1, Math.min(5, Math.round(dp.severity)));
                        const sevColor = severityColors[sevRounded - 1];
                        let label: string;
                        if (useAggregation && aggData[dotIdx]) {
                          // Show date range for the bucket (e.g. "Feb 3 - Feb 9")
                          const ad = aggData[dotIdx];
                          const fd = parseDate(ad.firstDate);
                          const ld = parseDate(ad.lastDate);
                          const fStr = `${MONTH_NAMES[fd.getMonth()]} ${fd.getDate()}`;
                          const lStr = `${MONTH_NAMES[ld.getMonth()]} ${ld.getDate()}`;
                          label = fStr === lStr ? fStr : `${fStr} - ${lStr}`;
                        } else {
                          // For 30D, show the actual date
                          const matchingDates = dates.filter((d) => getSev(d) !== null);
                          const dateStr = matchingDates[dotIdx];
                          if (!dateStr) return null;
                          const d = parseDate(dateStr);
                          label = `${MONTH_NAMES[d.getMonth()]} ${d.getDate()}`;
                        }
                        const tooltipX = Math.max(30, Math.min(CHART_W - 30, pt.x));
                        return (
                          <View style={[styles.tooltip, { left: tooltipX - 30, top: Math.max(0, pt.y - 36) }]}>
                            <EbbText type="caption" style={styles.tooltipDate}>{label}</EbbText>
                            <EbbText type="headline" style={[styles.tooltipValue, { color: sevColor }]}>{sevRounded}</EbbText>
                          </View>
                        );
                      })()}
                      <Svg width={CHART_W} height={CHART_H} viewBox={`0 0 ${CHART_W} ${CHART_H}`}>
                        <Defs>
                          <SvgGradient id={`grad-${symptom.id}`} x1="0" y1="0" x2="0" y2="1">
                            <Stop offset="0%" stopColor={chartFillColor} stopOpacity={0.3} />
                            <Stop offset="100%" stopColor={chartFillColor} stopOpacity={0.05} />
                          </SvgGradient>
                          {/* OPTION A: Horizontal severity zone bands (vertical gradient) */}
                          {/* Uncomment to use zone-based fill instead of timeline fill */}
                          {/*
                          <SvgGradient id={`zones-${symptom.id}`} x1="0" y1="1" x2="0" y2="0">
                            <Stop offset="0%" stopColor={severityColors[0]} stopOpacity={0.15} />
                            <Stop offset="25%" stopColor={severityColors[1]} stopOpacity={0.15} />
                            <Stop offset="50%" stopColor={severityColors[2]} stopOpacity={0.15} />
                            <Stop offset="75%" stopColor={severityColors[3]} stopOpacity={0.15} />
                            <Stop offset="100%" stopColor={severityColors[4]} stopOpacity={0.15} />
                          </SvgGradient>
                          */}
                          {/* OPTION B: Timeline gradient — each stop matches its data point's severity color */}
                          <SvgGradient id={`zones-${symptom.id}`} x1="0" y1="0" x2="1" y2="0">
                            {dataPoints.map((dp, idx) => {
                              const sevRounded = Math.max(1, Math.min(5, Math.round(dp.severity)));
                              const pct = totalPoints > 1 ? (dp.index / (totalPoints - 1)) * 100 : 0;
                              return (
                                <Stop
                                  key={idx}
                                  offset={`${pct}%`}
                                  stopColor={severityColors[sevRounded - 1]}
                                  stopOpacity={0.25}
                                />
                              );
                            })}
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
                            <Path d={areaPath} fill={`url(#zones-${symptom.id})`} />
                            {/* Range band for aggregated views (min-max spread) */}
                            {useAggregation && aggData.length > 1 && (() => {
                              const maxPoints = aggData.map((p) => ({
                                x: totalPoints > 1
                                  ? CHART_PAD + (p.index / (totalPoints - 1)) * (CHART_W - CHART_PAD * 2)
                                  : CHART_PAD,
                                y: CHART_PAD + (1 - (p.max - 1) / 4) * (CHART_H - CHART_PAD * 2),
                              }));
                              const minPoints = aggData.map((p) => ({
                                x: totalPoints > 1
                                  ? CHART_PAD + (p.index / (totalPoints - 1)) * (CHART_W - CHART_PAD * 2)
                                  : CHART_PAD,
                                y: CHART_PAD + (1 - (p.min - 1) / 4) * (CHART_H - CHART_PAD * 2),
                              }));
                              // Build band path: go along max left-to-right, then min right-to-left
                              let bandPath = `M${maxPoints[0].x} ${maxPoints[0].y}`;
                              for (let bi = 1; bi < maxPoints.length; bi++) {
                                bandPath += ` L${maxPoints[bi].x} ${maxPoints[bi].y}`;
                              }
                              for (let bi = minPoints.length - 1; bi >= 0; bi--) {
                                bandPath += ` L${minPoints[bi].x} ${minPoints[bi].y}`;
                              }
                              bandPath += ' Z';
                              return (
                                <Path
                                  d={bandPath}
                                  fill="rgba(0,0,0,0.06)"
                                  stroke="none"
                                />
                              );
                            })()}
                            <Path
                              d={linePath}
                              stroke={chartLineColor}
                              strokeWidth={1.5}
                              fill="none"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                            {/* Data point dots — larger, colored by severity to show trends */}
                            {/* For Month view, only show dot when severity changes from previous */}
                            {svgPoints.map((pt, idx) => {
                              const sevRounded = Math.max(1, Math.min(5, Math.round(dataPoints[idx].severity)));
                              const sevColor = severityColors[sevRounded - 1];
                              const isLast = idx === svgPoints.length - 1;
                              const isFirst = idx === 0;
                              const isSelected = selectedDot === `${symptom.id}-${idx}`;

                              // For 30D, skip dot if same severity as previous point
                              if (range === '30D' && !isFirst && !isLast && !isSelected) {
                                const prevSev = Math.max(1, Math.min(5, Math.round(dataPoints[idx - 1].severity)));
                                if (sevRounded === prevSev) return null;
                              }

                              return (
                                <Circle
                                  key={idx}
                                  cx={pt.x}
                                  cy={pt.y}
                                  r={isSelected ? 6 : isLast ? 5 : 4}
                                  fill={sevColor}
                                  stroke={isLast || isSelected ? '#FFFFFF' : 'none'}
                                  strokeWidth={isLast || isSelected ? 2 : 0}
                                  onPress={range !== '7D' ? () => {
                                    const key = `${symptom.id}-${idx}`;
                                    setSelectedDot(selectedDot === key ? null : key);
                                  } : undefined}
                                />
                              );
                            })}
                          </>
                        ) : null}
                      </Svg>
                    </Pressable>

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
                    {useAggregation && (
                      <View style={styles.bandLegend}>
                        <View style={styles.bandLegendSwatch} />
                        <EbbText type="caption" style={styles.bandLegendText}>
                          Band = daily range · Dot = {aggMode === 'weekly' ? 'weekly' : 'monthly'} avg
                        </EbbText>
                      </View>
                    )}
                  </View>
                </GlassCard>
                </Pressable>
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
    position: 'relative',
  },
  tooltip: {
    position: 'absolute',
    zIndex: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    shadowColor: 'rgba(0,0,0,0.15)',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    shadowOpacity: 1,
    elevation: 4,
    alignItems: 'center',
  },
  tooltipDate: {
    fontSize: 9,
    color: '#7A706B',
  },
  tooltipValue: {
    fontWeight: '700',
    fontSize: 16,
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
  bandLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.xs,
  },
  bandLegendSwatch: {
    width: 16,
    height: 8,
    borderRadius: 2,
    backgroundColor: 'rgba(0,0,0,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  bandLegendText: {
    color: colors.textMuted,
    fontSize: 10,
  },

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
