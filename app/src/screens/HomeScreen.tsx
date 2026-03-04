import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { useRouter } from 'expo-router';

import { colors, spacing, radius, getSymptomColor } from '../theme';
import { loadSettings, loadLog, loadAllLogs, getTodayDateString } from '../storage';
import { AppSettings, DailyLog, SeverityLevel } from '../types';
import GradientBackground from '../components/GradientBackground';
import SymptomIcon from '../components/SymptomIcon';
import EbbText from '../components/EbbText';

/** Convert hex color to rgba string at given opacity */
function hexToRgba(hex: string, opacity: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${opacity})`;
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
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
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [todayLog, setTodayLog] = useState<DailyLog | null>(null);
  const [last7Logs, setLast7Logs] = useState<Map<string, DailyLog>>(new Map());
  const today = getTodayDateString();

  // Track whether initial load has completed to avoid showing empty GradientBackground
  // on subsequent focus events (which confuses iOS scroll-edge detection on the tab bar)
  const hasLoadedOnce = useRef(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        // Load all data before updating any state — this prevents
        // multiple intermediate re-renders that cause iOS to
        // re-evaluate scroll-edge transparency on the native tab bar
        const [s, log, allLogs] = await Promise.all([
          loadSettings(),
          loadLog(today),
          loadAllLogs(),
        ]);
        if (cancelled) return;
        const last7Map = new Map<string, DailyLog>();
        for (let i = 0; i < 7; i++) {
          const dateStr = daysAgoDateString(i);
          const found = allLogs.find((l) => l.date === dateStr);
          if (found) last7Map.set(dateStr, found);
        }
        // Batch all state updates together in one render cycle
        setSettings(s);
        setTodayLog(log);
        setLast7Logs(last7Map);
        hasLoadedOnce.current = true;
      })();
      return () => { cancelled = true; };
    }, [today])
  );

  // After the first load, keep showing the previous content while refreshing
  // (prevents the empty GradientBackground flash that confuses the tab bar)
  if (!settings && !hasLoadedOnce.current) return <GradientBackground />;
  if (!settings) return <GradientBackground />;

  const hasSymptoms = settings.symptoms.length > 0;
  const loggedToday = todayLog !== null;

  function getSeverityForSymptom(log: DailyLog, symptomId: string): SeverityLevel | null {
    const entry = log.entries.find((e) => e.symptomId === symptomId);
    return entry ? entry.severity : null;
  }

  return (
    <GradientBackground>
      <View style={{ flex: 1 }} collapsable={false}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.md, paddingBottom: 120 }]}
        showsVerticalScrollIndicator={false}
        scrollIndicatorInsets={{ bottom: 0 }}
        automaticallyAdjustsScrollIndicatorInsets={false}
        contentInsetAdjustmentBehavior="never"
      >
        {/* Greeting — stays white on gradient */}
        <EbbText type="largeTitle" style={styles.greetingName}>{getGreeting()}</EbbText>

        {!hasSymptoms ? (
          <View style={[styles.whiteCard, styles.cardSpacing]}>
            <View style={styles.cardPad}>
              <EbbText type="body" style={styles.emptyText}>
                No symptoms set up yet.{'\n'}Go to Settings to add some.
              </EbbText>
            </View>
          </View>
        ) : (
          <>
            {/* This Week trend card */}
            <View style={[styles.whiteCard, styles.cardSpacing]}>
              <View style={styles.cardPad}>
                <EbbText type="caption" style={styles.sectionLabel}>THIS WEEK</EbbText>
                {settings.symptoms.slice(0, 3).map((symptom) => {
                  const dayInitials = getLast7DayInitials();
                  const symptomColor = getSymptomColor(symptom.name);
                  return (
                    <View key={symptom.id} style={styles.trendSymptomRow}>
                      <View style={styles.trendHeader}>
                        <SymptomIcon
                          name={symptom.name}
                          size={22}
                          color={symptomColor}
                          showBox
                          boxSize={34}
                          boxColor={hexToRgba(symptomColor, 0.15)}
                        />
                        <EbbText type="footnote" style={styles.trendSymptomName}>{symptom.name}</EbbText>
                      </View>
                      <View style={styles.trendRow}>
                        {Array.from({ length: 7 }, (_, i) => {
                          const dateStr = daysAgoDateString(6 - i);
                          const log = last7Logs.get(dateStr);
                          const sev = log ? getSeverityForSymptom(log, symptom.id) : null;
                          const isToday = i === 6;
                          return (
                            <View key={i} style={styles.trendCell}>
                              {sev && (
                                <EbbText type="caption" style={styles.barValueLabel}>{sev}</EbbText>
                              )}
                              <View style={styles.barTrack}>
                                {sev && (
                                  <View
                                    style={[
                                      styles.barFill,
                                      {
                                        height: `${(sev / 5) * 100}%`,
                                        backgroundColor: symptomColor,
                                      },
                                    ]}
                                  />
                                )}
                              </View>
                              <EbbText type="footnote" style={[styles.trendDayLabel, isToday && styles.trendDayLabelToday]}>
                                {dayInitials[i]}
                              </EbbText>
                            </View>
                          );
                        })}
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Today's Symptoms summary */}
            <View style={[styles.whiteCard, styles.cardSpacing]}>
              <View style={styles.cardPad}>
                <EbbText type="caption" style={styles.sectionLabel}>TODAY'S SYMPTOMS</EbbText>
                {settings.symptoms.map((symptom) => {
                  const sev = todayLog ? getSeverityForSymptom(todayLog, symptom.id) : null;
                  const symptomColor = getSymptomColor(symptom.name);
                  return (
                    <View key={symptom.id} style={styles.symptomRow}>
                      <SymptomIcon
                        name={symptom.name}
                        size={22}
                        color={symptomColor}
                        showBox
                        boxSize={34}
                        boxColor={hexToRgba(symptomColor, 0.15)}
                      />
                      <EbbText type="footnote" style={styles.symptomName}>{symptom.name}</EbbText>
                      <View style={styles.barTrackWide}>
                        {sev && (
                          <View
                            style={[
                              styles.barFillHoriz,
                              {
                                width: `${(sev / 5) * 100}%`,
                                backgroundColor: symptomColor,
                              },
                            ]}
                          />
                        )}
                      </View>
                      {sev != null && (
                        <EbbText type="subhead" style={styles.scoreText}>
                          {sev}
                        </EbbText>
                      )}
                    </View>
                  );
                })}
              </View>
            </View>

            {/* CTA */}
            {!loggedToday ? (
              <Pressable
                onPress={() => router.push('/home/daily-log')}
                style={({ pressed }) => [
                  styles.ctaButton,
                  pressed && styles.ctaButtonPressed,
                ]}
              >
                <EbbText type="button" style={styles.ctaButtonText}>Log Today's Symptoms</EbbText>
              </Pressable>
            ) : (
              <View style={styles.loggedPill}>
                <EbbText type="button" style={styles.loggedText}>Logged</EbbText>
              </View>
            )}
          </>
        )}
      </ScrollView>
      </View>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.md,
  },
  greetingSub: {
    color: 'rgba(255,255,255,0.7)',
    textShadowColor: 'rgba(0,0,0,0.15)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  greetingName: {
    color: '#FFFFFF',
    marginBottom: spacing.sm + 4,
    textShadowColor: 'rgba(0,0,0,0.15)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },

  // Solid white card — replaces GlassCard on gradient screens
  whiteCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    shadowColor: 'rgba(0,0,0,0.08)',
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 16,
    shadowOpacity: 1,
    elevation: 4,
  },
  cardSpacing: {
    marginBottom: spacing.md,
  },
  cardPad: {
    padding: spacing.md,
  },

  // Section labels — dark on white cards
  sectionLabel: {
    color: colors.textMuted,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: spacing.sm + 2,
    fontWeight: '600',
  },
  emptyText: {
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },

  // Trend card
  trendSymptomRow: {
    marginBottom: spacing.sm + 2,
  },
  trendHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  trendSymptomName: {
    fontWeight: '600',
    color: colors.text,
  },
  trendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 48,
  },
  trendCell: {
    flex: 1,
    alignItems: 'center',
  },
  barValueLabel: {
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  barTrack: {
    width: 8,
    height: 26,
    borderRadius: 4,
    backgroundColor: '#E5E0DD',
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: 4,
  },
  trendDayLabel: {
    color: colors.textMuted,
    marginTop: 3,
  },
  trendDayLabelToday: {
    fontWeight: '700',
    color: colors.primary,
  },

  // Symptom summary
  symptomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  symptomName: {
    fontWeight: '500',
    color: colors.text,
    width: 80,
  },
  barTrackWide: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E5E0DD',
  },
  barFillHoriz: {
    height: '100%',
    borderRadius: 3,
    overflow: 'hidden',
  },
  scoreText: {
    fontWeight: '700',
    color: colors.text,
    width: 24,
    textAlign: 'right',
  },

  // CTA — solid coral button, white text
  ctaButton: {
    backgroundColor: '#E8725A',
    borderRadius: 18,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.sm,
    shadowColor: 'rgba(0,0,0,0.15)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 4,
  },
  ctaButtonPressed: {
    backgroundColor: '#C2553F',
  },
  ctaButtonText: {
    color: '#FFFFFF',
  },
  loggedPill: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    borderRadius: 18,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  loggedText: {
    color: '#FFFFFF',
  },
});
