import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import { colors, severity as severityColors, spacing, fontSize, radius, fontWeight } from '../theme';
import { loadSettings, loadLog, loadAllLogs, getTodayDateString } from '../storage';
import { AppSettings, DailyLog, SeverityLevel } from '../types';
import { HomeStackParamList } from '../navigation';
import GlassCard from '../components/GlassCard';
import GradientBackground from '../components/GradientBackground';
import CoralButton from '../components/CoralButton';
import SymptomIcon from '../components/SymptomIcon';

type NavProp = StackNavigationProp<HomeStackParamList, 'Home'>;

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning,';
  if (h < 17) return 'Good afternoon,';
  return 'Good evening,';
}

function daysAgoDateString(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

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
  const insets = useSafeAreaInsets();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [todayLog, setTodayLog] = useState<DailyLog | null>(null);
  const [last7Logs, setLast7Logs] = useState<Map<string, DailyLog>>(new Map());
  const today = getTodayDateString();

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const s = await loadSettings();
        setSettings(s);
        const log = await loadLog(today);
        setTodayLog(log);
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

  return (
    <GradientBackground>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.lg, paddingBottom: 120 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Greeting */}
        <Text style={styles.greetingSub}>{getGreeting()}</Text>
        <Text style={styles.greetingName}>Julia</Text>

        {!hasSymptoms ? (
          <GlassCard style={styles.cardSpacing}>
            <View style={styles.cardPad}>
              <Text style={styles.emptyText}>
                No symptoms set up yet.{'\n'}Go to Settings to add some.
              </Text>
            </View>
          </GlassCard>
        ) : (
          <>
            {/* This Week trend card */}
            <GlassCard style={styles.cardSpacing}>
              <View style={styles.cardPad}>
                <Text style={styles.sectionLabel}>THIS WEEK</Text>
                {settings.symptoms.slice(0, 3).map((symptom) => {
                  const dayInitials = getLast7DayInitials();
                  return (
                    <View key={symptom.id} style={styles.trendSymptomRow}>
                      <View style={styles.trendHeader}>
                        <SymptomIcon name={symptom.name} size={14} color="rgba(255,255,255,0.8)" showBox />
                        <Text style={styles.trendSymptomName}>{symptom.name}</Text>
                      </View>
                      <View style={styles.trendRow}>
                        {Array.from({ length: 7 }, (_, i) => {
                          const dateStr = daysAgoDateString(6 - i);
                          const log = last7Logs.get(dateStr);
                          const sev = log ? getSeverityForSymptom(log, symptom.id) : null;
                          const isToday = i === 6;
                          return (
                            <View key={i} style={styles.trendCell}>
                              <View style={styles.barTrack}>
                                {sev && (
                                  <View
                                    style={[
                                      styles.barFill,
                                      {
                                        height: `${(sev / 5) * 100}%`,
                                        backgroundColor: severityColors[sev - 1],
                                      },
                                    ]}
                                  />
                                )}
                              </View>
                              <Text style={styles.trendDayLabel}>{dayInitials[i]}</Text>
                              {isToday && <View style={styles.todayDot} />}
                            </View>
                          );
                        })}
                      </View>
                    </View>
                  );
                })}
              </View>
            </GlassCard>

            {/* Today's Symptoms summary */}
            <GlassCard style={styles.cardSpacing}>
              <View style={styles.cardPad}>
                <Text style={styles.sectionLabel}>TODAY'S SYMPTOMS</Text>
                {settings.symptoms.map((symptom) => {
                  const sev = todayLog ? getSeverityForSymptom(todayLog, symptom.id) : null;
                  return (
                    <View key={symptom.id} style={styles.symptomRow}>
                      <SymptomIcon name={symptom.name} size={14} color="rgba(255,255,255,0.8)" showBox />
                      <Text style={styles.symptomName}>{symptom.name}</Text>
                      <View style={styles.barTrackWide}>
                        {sev && (
                          <View
                            style={[
                              styles.barFillHoriz,
                              {
                                width: `${(sev / 5) * 100}%`,
                                backgroundColor: severityColors[sev - 1],
                              },
                            ]}
                          />
                        )}
                      </View>
                      <Text style={styles.scoreText}>
                        {sev ?? '-'}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </GlassCard>

            {/* CTA */}
            {!loggedToday ? (
              <CoralButton
                label="Log Today's Symptoms"
                onPress={() => navigation.navigate('DailyLog')}
                style={styles.ctaButton}
              />
            ) : (
              <View style={styles.loggedPill}>
                <Text style={styles.loggedText}>Logged</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.lg,
  },
  greetingSub: {
    fontFamily: 'DMSans_400Regular',
    fontSize: fontSize.md,
    color: 'rgba(255,255,255,0.65)',
  },
  greetingName: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 32,
    color: '#FFFFFF',
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: fontSize.xs,
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: spacing.md,
  },
  cardSpacing: {
    marginBottom: spacing.md,
  },
  cardPad: {
    padding: spacing.lg,
  },
  emptyText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: fontSize.md,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: 22,
  },

  // Trend card
  trendSymptomRow: {
    marginBottom: spacing.md,
  },
  trendHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  trendSymptomName: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: fontSize.sm,
    color: 'rgba(255,255,255,0.85)',
  },
  trendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 40,
  },
  trendCell: {
    flex: 1,
    alignItems: 'center',
  },
  barTrack: {
    width: 8,
    height: 32,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: 4,
  },
  trendDayLabel: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 3,
  },
  todayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
    marginTop: 2,
  },

  // Symptom summary
  symptomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  symptomName: {
    fontFamily: 'DMSans_500Medium',
    fontSize: fontSize.sm,
    color: '#FFFFFF',
    width: 80,
  },
  barTrackWide: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
  },
  barFillHoriz: {
    height: '100%',
    borderRadius: 3,
  },
  scoreText: {
    fontFamily: 'DMSans_700Bold',
    fontSize: fontSize.md,
    color: '#FFFFFF',
    width: 24,
    textAlign: 'right',
  },

  // CTA
  ctaButton: {
    marginTop: spacing.sm,
  },
  loggedPill: {
    backgroundColor: 'rgba(126,184,164,0.3)',
    borderWidth: 1,
    borderColor: 'rgba(126,184,164,0.5)',
    borderRadius: 18,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  loggedText: {
    fontFamily: 'DMSans_700Bold',
    fontSize: fontSize.md,
    color: colors.sage,
  },
});
