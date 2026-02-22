import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import { colors, severity as severityColors, spacing, fontSize, radius } from '../theme';
import { loadSettings, loadLog, loadAllLogs, getTodayDateString } from '../storage';
import { AppSettings, DailyLog, SeverityLevel } from '../types';
import { HomeStackParamList } from '../navigation';

type NavProp = StackNavigationProp<HomeStackParamList, 'Home'>;

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatFriendlyDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

/** Returns the date string for N days ago (0 = today) */
function daysAgoDateString(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Day initials for the last 7 days (today = last) */
function getLast7DayInitials(): string[] {
  const initials = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return initials[d.getDay()];
  });
}

export default function HomeScreen() {
  const navigation = useNavigation<NavProp>();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [todayLog, setTodayLog] = useState<DailyLog | null>(null);
  const [last7Logs, setLast7Logs] = useState<Map<string, DailyLog>>(new Map());
  const today = getTodayDateString();

  // Reload data every time screen comes into focus (e.g., after saving a log)
  useFocusEffect(
    useCallback(() => {
      (async () => {
        const s = await loadSettings();
        setSettings(s);

        const log = await loadLog(today);
        setTodayLog(log);

        // Load last 7 days for trend
        const allLogs = await loadAllLogs();
        const last7Map = new Map<string, DailyLog>();
        for (let i = 0; i < 7; i++) {
          const dateStr = daysAgoDateString(i);
          const found = allLogs.find((l) => l.date === dateStr);
          if (found) last7Map.set(dateStr, found);
        }
        setLast7Logs(last7Map);
      })();
    }, [today])
  );

  if (!settings) return null;

  const hasSymptoms = settings.symptoms.length > 0;
  const loggedToday = todayLog !== null;

  function getSeverityForSymptom(log: DailyLog, symptomId: string): SeverityLevel | null {
    const entry = log.entries.find((e) => e.symptomId === symptomId);
    return entry ? entry.severity : null;
  }

  function renderSeverityDots(severity: SeverityLevel | null) {
    return (
      <View style={styles.dotsRow}>
        {([1, 2, 3, 4, 5] as SeverityLevel[]).map((level) => (
          <View
            key={level}
            style={[
              styles.dot,
              {
                backgroundColor:
                  severity !== null && level <= severity
                    ? severityColors[severity - 1]
                    : colors.border,
              },
            ]}
          />
        ))}
      </View>
    );
  }

  /** 7-day trend squares for one symptom */
  function renderTrend(symptomId: string) {
    const dayInitials = getLast7DayInitials();
    return (
      <View style={styles.trendRow}>
        {Array.from({ length: 7 }, (_, i) => {
          const dateStr = daysAgoDateString(6 - i);
          const log = last7Logs.get(dateStr);
          const sev = log ? getSeverityForSymptom(log, symptomId) : null;
          return (
            <View key={i} style={styles.trendCell}>
              <View
                style={[
                  styles.trendSquare,
                  { backgroundColor: sev ? severityColors[sev - 1] : colors.border },
                ]}
              />
              <Text style={styles.trendLabel}>{dayInitials[i]}</Text>
            </View>
          );
        })}
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <Text style={styles.greeting}>{getGreeting()} 👋</Text>
        <Text style={styles.date}>{formatFriendlyDate(today)}</Text>

        {!hasSymptoms ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              No symptoms set up yet.{'\n'}Go to Settings → My Symptoms to add some.
            </Text>
          </View>
        ) : !loggedToday ? (
          /* ─── Not logged today ─── */
          <TouchableOpacity
            style={styles.logButton}
            onPress={() => navigation.navigate('DailyLog')}
            activeOpacity={0.8}
          >
            <Text style={styles.logButtonText}>Log Today →</Text>
          </TouchableOpacity>
        ) : (
          /* ─── Already logged today ─── */
          <View style={styles.loggedCard}>
            <Text style={styles.loggedTitle}>✅ Logged today</Text>
            {settings.symptoms.map((symptom) => {
              const sev = getSeverityForSymptom(todayLog!, symptom.id);
              return (
                <View key={symptom.id} style={styles.symptomRow}>
                  <Text style={styles.symptomName}>{symptom.name}</Text>
                  {renderSeverityDots(sev)}
                </View>
              );
            })}
            {todayLog?.note ? (
              <Text style={styles.noteText}>📝 {todayLog.note}</Text>
            ) : null}
          </View>
        )}

        {/* 7-day trends */}
        {hasSymptoms && (
          <View style={styles.trendSection}>
            <Text style={styles.sectionTitle}>Last 7 days</Text>
            {settings.symptoms.map((symptom) => (
              <View key={symptom.id} style={styles.trendSymptomRow}>
                <Text style={styles.trendSymptomName}>{symptom.name}</Text>
                {renderTrend(symptom.id)}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  greeting: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
  },
  date: {
    fontSize: fontSize.lg,
    color: colors.textMuted,
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
  },
  emptyState: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyText: {
    fontSize: fontSize.lg,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 24,
  },
  logButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  logButtonText: {
    color: '#FFFFFF',
    fontSize: fontSize.xl,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  loggedCard: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  loggedTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.md,
  },
  symptomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  symptomName: {
    fontSize: fontSize.lg,
    color: colors.text,
    flex: 1,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 4,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  noteText: {
    marginTop: spacing.md,
    fontSize: fontSize.md,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  trendSection: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  trendSymptomRow: {
    marginBottom: spacing.md,
  },
  trendSymptomName: {
    fontSize: fontSize.md,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  trendRow: {
    flexDirection: 'row',
    gap: 4,
  },
  trendCell: {
    alignItems: 'center',
    gap: 2,
  },
  trendSquare: {
    width: 24,
    height: 24,
    borderRadius: 4,
  },
  trendLabel: {
    fontSize: 10,
    color: colors.textMuted,
  },
});
