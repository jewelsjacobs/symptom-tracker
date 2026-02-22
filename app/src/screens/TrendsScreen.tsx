import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

import { colors, severity as severityColors, spacing, fontSize, radius } from '../theme';
import { loadAllLogs, loadSettings } from '../storage';
import { AppSettings, DailyLog, SeverityLevel } from '../types';

/** Returns YYYY-MM-DD for N days ago (0 = today) */
function daysAgoDateString(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-');
}

/** Day initial (M/T/W/T/F/S/S) for a date string */
function dayInitial(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  return ['S', 'M', 'T', 'W', 'T', 'F', 'S'][d.getDay()];
}

const BAR_MAX_HEIGHT = 80;
const BAR_WIDTH = 28;

export default function TrendsScreen() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [logMap, setLogMap] = useState<Map<string, DailyLog>>(new Map());

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

  const last7Days = Array.from({ length: 7 }, (_, i) => daysAgoDateString(6 - i));

  function getSeverity(symptomId: string, date: string): SeverityLevel | null {
    const log = logMap.get(date);
    if (!log) return null;
    const entry = log.entries.find((e) => e.symptomId === symptomId);
    return entry ? entry.severity : null;
  }

  const hasAnyLogs = logMap.size > 0;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Trends</Text>
        <Text style={styles.subtitle}>Last 7 days · Unlimited history with Premium</Text>
      </View>

      {!hasAnyLogs ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>
            No data yet.{'\n'}Log a few days to see your trends here 📈
          </Text>
        </View>
      ) : settings.symptoms.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Add symptoms in Settings to see trends.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {settings.symptoms.map((symptom) => {
            const values = last7Days.map((date) => ({
              date,
              severity: getSeverity(symptom.id, date),
              initial: dayInitial(date),
            }));

            // Average for the period (ignore nulls)
            const filled = values.filter((v) => v.severity !== null);
            const avg =
              filled.length > 0
                ? (filled.reduce((s, v) => s + (v.severity ?? 0), 0) / filled.length).toFixed(1)
                : '—';

            return (
              <View key={symptom.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.symptomName}>{symptom.name}</Text>
                  <View style={styles.avgBadge}>
                    <Text style={styles.avgLabel}>7-day avg</Text>
                    <Text style={styles.avgValue}>{avg}</Text>
                  </View>
                </View>

                {/* Bar chart */}
                <View style={styles.chartArea}>
                  {/* Y-axis labels */}
                  <View style={styles.yAxis}>
                    {[5, 4, 3, 2, 1].map((v) => (
                      <Text key={v} style={styles.yLabel}>
                        {v}
                      </Text>
                    ))}
                  </View>

                  {/* Bars */}
                  <View style={styles.barsRow}>
                    {values.map(({ date, severity, initial }) => {
                      const barHeight = severity ? (severity / 5) * BAR_MAX_HEIGHT : 4;
                      const barColor = severity
                        ? severityColors[(severity as SeverityLevel) - 1]
                        : colors.border;
                      const isToday = date === daysAgoDateString(0);

                      return (
                        <View key={date} style={styles.barCell}>
                          <View style={styles.barContainer}>
                            <View
                              style={[
                                styles.bar,
                                {
                                  height: barHeight,
                                  backgroundColor: barColor,
                                  opacity: severity ? 1 : 0.4,
                                },
                              ]}
                            />
                          </View>
                          <Text
                            style={[styles.barLabel, isToday && styles.barLabelToday]}
                          >
                            {initial}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </View>

                {/* Severity legend */}
                <View style={styles.legend}>
                  <View style={styles.legendRow}>
                    {severityColors.map((col, i) => (
                      <View key={i} style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: col }]} />
                        <Text style={styles.legendText}>{i + 1}</Text>
                      </View>
                    ))}
                    <Text style={styles.legendHint}>  mild → severe</Text>
                  </View>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { fontSize: fontSize.xxl, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: 2 },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyText: {
    fontSize: fontSize.lg,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 26,
  },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  symptomName: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text },
  avgBadge: { alignItems: 'flex-end' },
  avgLabel: { fontSize: fontSize.sm, color: colors.textMuted },
  avgValue: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.primary,
  },
  chartArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: BAR_MAX_HEIGHT + 24,
  },
  yAxis: {
    height: BAR_MAX_HEIGHT,
    justifyContent: 'space-between',
    marginRight: spacing.xs,
    paddingBottom: 2,
  },
  yLabel: {
    fontSize: 10,
    color: colors.textMuted,
    textAlign: 'right',
    lineHeight: 16,
  },
  barsRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
  },
  barCell: {
    flex: 1,
    alignItems: 'center',
    height: BAR_MAX_HEIGHT + 24,
    justifyContent: 'flex-end',
  },
  barContainer: {
    height: BAR_MAX_HEIGHT,
    justifyContent: 'flex-end',
    width: '100%',
    alignItems: 'center',
  },
  bar: {
    width: BAR_WIDTH,
    borderRadius: 4,
    minHeight: 4,
  },
  barLabel: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 4,
  },
  barLabelToday: {
    color: colors.primary,
    fontWeight: '700',
  },
  legend: { marginTop: spacing.md },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 11, color: colors.textMuted },
  legendHint: { fontSize: 11, color: colors.textMuted, fontStyle: 'italic' },
});
