import React, { useCallback, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Pressable,
  Modal,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import Svg, { Rect, Path } from 'react-native-svg';

import { colors, severity as severityColors, spacing, radius, getSymptomColor } from '../theme';
import { loadAllLogs, loadSettings } from '../storage';
import { AppSettings, DailyLog, SeverityLevel } from '../types';
import { usePremium } from '../purchases/usePremium';
import SymptomIcon from '../components/SymptomIcon';
import CreamBackground from '../components/CreamBackground';
import GlassCard from '../components/GlassCard';
import CoralButton from '../components/CoralButton';
import EbbText from '../components/EbbText';

const HISTORY_FREE_DAYS = 30;

function formatFriendlyDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function formatFullDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function getTodayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function avgSeverity(log: DailyLog): number {
  if (!log.entries.length) return 0;
  return log.entries.reduce((sum, e) => sum + e.severity, 0) / log.entries.length;
}

/** Get the last 7 dates for the calendar strip */
function getLast7Dates(): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
}

function dayInitial(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  return ['S', 'M', 'T', 'W', 'T', 'F', 'S'][d.getDay()];
}

function dayNumber(dateStr: string): string {
  return dateStr.split('-')[2].replace(/^0/, '');
}

export default function HistoryScreen() {
  const router = useRouter();
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [selected, setSelected] = useState<DailyLog | null>(null);
  const { premium } = usePremium();
  const today = getTodayString();

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const [s, allLogs] = await Promise.all([loadSettings(), loadAllLogs()]);
        setSettings(s);
        if (premium) {
          setLogs(allLogs);
        } else {
          const cutoff = new Date();
          cutoff.setDate(cutoff.getDate() - HISTORY_FREE_DAYS);
          setLogs(allLogs.filter((log) => new Date(log.date) >= cutoff));
        }
      })();
    }, [premium])
  );

  const logMap = new Map(logs.map((l) => [l.date, l]));

  function getAccentColor(log: DailyLog): string {
    const avg = avgSeverity(log);
    const idx = Math.round(avg) - 1;
    return severityColors[Math.max(0, Math.min(4, idx))];
  }

  const calDates = getLast7Dates();

  return (
    <CreamBackground>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <EbbText type="largeTitle" style={styles.title}>History</EbbText>
          <EbbText type="body" style={styles.subtitle}>{logs.length} days logged</EbbText>
        </View>

        {/* Calendar strip */}
        <GlassCard variant="cream" style={styles.calCard}>
          <View style={styles.calStrip}>
            {calDates.map((date) => {
              const log = logMap.get(date);
              const isToday = date === today;
              const avg = log ? avgSeverity(log) : 0;
              const idx = Math.round(avg) - 1;
              const fillColor = log ? severityColors[Math.max(0, Math.min(4, idx))] : undefined;
              return (
                <Pressable
                  key={date}
                  style={styles.calDay}
                  onPress={() => log && setSelected(log)}
                >
                  <EbbText type="caption" style={styles.calDayLabel}>{dayInitial(date)}</EbbText>
                  <View
                    style={[
                      styles.calCircle,
                      fillColor ? { backgroundColor: fillColor } : styles.calCircleEmpty,
                      isToday && !fillColor && styles.calCircleToday,
                    ]}
                  >
                    <EbbText type="footnote" style={[
                      styles.calDayNum,
                      fillColor ? styles.calDayNumFilled : undefined,
                      isToday && !fillColor ? styles.calDayNumToday : undefined,
                    ]}>
                      {dayNumber(date)}
                    </EbbText>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </GlassCard>

        {logs.length === 0 ? (
          <View style={styles.empty}>
            <GlassCard variant="cream" style={styles.emptyIconCard}>
              <View style={styles.emptyIconWrap}>
                <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
                  <Rect x="3" y="4" width="18" height="18" rx="3" stroke={colors.primary} strokeWidth={1.8} fill="none" />
                  <Path d="M3 9h18" stroke={colors.primary} strokeWidth={1.8} />
                  <Path d="M8 2v4M16 2v4" stroke={colors.primary} strokeWidth={1.8} strokeLinecap="round" />
                </Svg>
              </View>
            </GlassCard>
            <EbbText type="headline" style={styles.emptyTitle}>No logs yet</EbbText>
            <EbbText type="body" style={styles.emptyText}>
              Start with today — it only takes 30 seconds
            </EbbText>
            <CoralButton
              label="Log Today"
              onPress={() => router.push('/home/daily-log')}
              style={styles.emptyBtn}
            />
          </View>
        ) : (
          <FlatList
            data={logs}
            keyExtractor={(item) => item.date}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <Pressable onPress={() => setSelected(item)}>
                <GlassCard variant="cream" style={styles.rowCard}>
                  <View style={styles.rowInner}>
                    <View style={[styles.accentBar, { backgroundColor: getAccentColor(item) }]}>
                      <EbbText type="caption" style={styles.accentBarLabel}>{avgSeverity(item).toFixed(1)}</EbbText>
                    </View>
                    <View style={styles.rowContent}>
                      <View style={styles.rowTop}>
                        <EbbText type="headline" style={styles.rowDate}>
                          {item.date === today ? 'Today' : formatFriendlyDate(item.date)}
                        </EbbText>
                        <EbbText type="headline" style={styles.chevron}>{'\u203A'}</EbbText>
                      </View>
                      <View style={styles.dotsRow}>
                        {item.entries.map((entry) => {
                          const symptom = settings?.symptoms.find((s) => s.id === entry.symptomId);
                          const dotColor = severityColors[entry.severity - 1];
                          return (
                            <View
                              key={entry.symptomId}
                              style={[styles.dot, { backgroundColor: dotColor }]}
                            />
                          );
                        })}
                      </View>
                      {item.note ? (
                        <EbbText type="footnote" style={styles.notePreview} numberOfLines={1}>
                          {item.note}
                        </EbbText>
                      ) : null}
                    </View>
                  </View>
                </GlassCard>
              </Pressable>
            )}
          />
        )}

        {/* Day detail bottom sheet */}
        {selected && settings && (
          <Modal
            visible={!!selected}
            animationType="slide"
            transparent
            onRequestClose={() => setSelected(null)}
          >
            <Pressable style={styles.modalOverlay} onPress={() => setSelected(null)}>
              <Pressable style={styles.modalCard} onPress={() => {}}>
                <BlurView intensity={80} tint="light" style={styles.modalBlur}>
                  <View style={styles.modalInner}>
                    <View style={styles.modalHeader}>
                      <EbbText type="headline" style={styles.modalTitle}>{formatFullDate(selected.date)}</EbbText>
                    </View>
                    <ScrollView showsVerticalScrollIndicator={false}>
                      {selected.entries.map((entry) => {
                        const symptom = settings.symptoms.find((s) => s.id === entry.symptomId);
                        const name = symptom?.name ?? 'Unknown symptom';
                        const iconColor = symptom ? getSymptomColor(name) : colors.text;
                        return (
                          <View key={entry.symptomId} style={styles.modalRow}>
                            <SymptomIcon name={name} size={22} color={iconColor} showBox boxSize={34} />
                            <EbbText type="body" style={[styles.modalSymptomName, !symptom && styles.modalSymptomMissing]}>
                              {name}
                            </EbbText>
                            <View style={styles.modalDotsRow}>
                              {([1, 2, 3, 4, 5] as SeverityLevel[]).map((level) => (
                                <View
                                  key={level}
                                  style={[
                                    styles.modalDot,
                                    {
                                      backgroundColor:
                                        level <= entry.severity
                                          ? severityColors[entry.severity - 1]
                                          : 'rgba(0,0,0,0.08)',
                                    },
                                  ]}
                                />
                              ))}
                            </View>
                          </View>
                        );
                      })}
                      {selected.note ? (
                        <View style={styles.modalNote}>
                          <EbbText type="caption" style={styles.modalNoteLabel}>NOTE</EbbText>
                          <EbbText type="body" style={styles.modalNoteText}>{selected.note}</EbbText>
                        </View>
                      ) : null}
                    </ScrollView>
                    <CoralButton label="Close" onPress={() => setSelected(null)} />
                  </View>
                </BlurView>
              </Pressable>
            </Pressable>
          </Modal>
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
    paddingBottom: spacing.md,
  },
  title: {
    color: colors.text,
  },
  subtitle: {
    color: colors.sage,
    marginTop: 2,
  },

  // Calendar strip
  calCard: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  calStrip: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  calDay: {
    alignItems: 'center',
    gap: 4,
  },
  calDayLabel: {
    color: colors.textMuted,
  },
  calCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  calCircleEmpty: {
    backgroundColor: 'rgba(0,0,0,0.04)',
  },
  calCircleToday: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  calDayNum: {
    fontWeight: '600',
    color: colors.text,
  },
  calDayNumFilled: {
    color: '#FFFFFF',
  },
  calDayNumToday: {
    color: colors.primary,
    fontWeight: '700',
  },

  // Empty state
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
  emptyBtn: {
    marginTop: spacing.lg,
    alignSelf: 'center',
    paddingHorizontal: spacing.xl,
  },

  // List
  list: { paddingVertical: spacing.xs, paddingBottom: 100 },
  rowCard: {
    marginHorizontal: spacing.md,
    marginVertical: spacing.xs,
  },
  rowInner: {
    flexDirection: 'row',
    overflow: 'hidden',
  },
  accentBar: {
    width: 28,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 4,
  },
  accentBarLabel: {
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  rowContent: { flex: 1, padding: spacing.md },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  rowDate: {
    color: colors.text,
  },
  chevron: {
    color: colors.textMuted,
  },
  dotsRow: { flexDirection: 'row', gap: 5, flexWrap: 'wrap' },
  dot: { width: 12, height: 12, borderRadius: 6 },
  notePreview: {
    color: colors.textMuted,
    marginTop: spacing.xs,
    fontStyle: 'italic',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    overflow: 'hidden',
    maxHeight: '70%',
  },
  modalBlur: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    overflow: 'hidden',
  },
  modalInner: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    padding: spacing.lg,
    paddingTop: spacing.lg,
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(0,0,0,0.12)',
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  modalHeader: {
    marginBottom: spacing.lg,
  },
  modalTitle: {
    color: colors.text,
  },
  modalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  modalSymptomName: {
    color: colors.text,
    flex: 1,
  },
  modalSymptomMissing: {
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  modalDotsRow: { flexDirection: 'row', gap: 4 },
  modalDot: { width: 12, height: 12, borderRadius: 6 },
  modalNote: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: 'rgba(253,248,245,0.6)',
    borderRadius: radius.sm,
  },
  modalNoteLabel: {
    fontWeight: '600',
    color: colors.textMuted,
    letterSpacing: 1.2,
    marginBottom: spacing.xs,
  },
  modalNoteText: {
    color: colors.text,
    lineHeight: 22,
  },
});
