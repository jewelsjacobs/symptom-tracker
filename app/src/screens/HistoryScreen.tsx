import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Modal,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

import { colors, severity as severityColors, spacing, fontSize, radius } from '../theme';
import { loadAllLogs, loadSettings } from '../storage';
import { AppSettings, DailyLog, SeverityLevel } from '../types';
import { usePremium } from '../purchases/usePremium';
import SymptomIcon from '../components/SymptomIcon';

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
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>History</Text>
        <Text style={styles.subtitle}>{logs.length} days logged</Text>
      </View>

      {/* Calendar strip */}
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
              <Text style={styles.calDayLabel}>{dayInitial(date)}</Text>
              <View
                style={[
                  styles.calCircle,
                  fillColor ? { backgroundColor: fillColor } : styles.calCircleEmpty,
                  isToday && styles.calCircleToday,
                ]}
              >
                <Text style={[styles.calDayNum, fillColor ? styles.calDayNumFilled : undefined]}>
                  {dayNumber(date)}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      {logs.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No logs yet</Text>
          <Text style={styles.emptyText}>
            Start with today — it only takes 30 seconds
          </Text>
        </View>
      ) : (
        <FlatList
          data={logs}
          keyExtractor={(item) => item.date}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Pressable
              style={styles.row}
              onPress={() => setSelected(item)}
            >
              <View style={[styles.accentBar, { backgroundColor: getAccentColor(item) }]} />
              <View style={styles.rowContent}>
                <View style={styles.rowTop}>
                  <Text style={styles.rowDate}>
                    {item.date === today ? 'Today' : formatFriendlyDate(item.date)}
                  </Text>
                  <Text style={styles.chevron}>{'\u203A'}</Text>
                </View>
                <View style={styles.dotsRow}>
                  {item.entries.map((entry) => (
                    <View
                      key={entry.symptomId}
                      style={[styles.dot, { backgroundColor: severityColors[entry.severity - 1] }]}
                    />
                  ))}
                </View>
                {item.note ? (
                  <Text style={styles.notePreview} numberOfLines={1}>
                    {item.note}
                  </Text>
                ) : null}
              </View>
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
              <View style={styles.handleBar} />
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{formatFullDate(selected.date)}</Text>
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                {selected.entries.map((entry) => {
                  const symptom = settings.symptoms.find((s) => s.id === entry.symptomId);
                  const name = symptom?.name ?? 'Unknown symptom';
                  return (
                    <View key={entry.symptomId} style={styles.modalRow}>
                      <SymptomIcon name={name} size={14} color={colors.text} showBox />
                      <Text style={[styles.modalSymptomName, !symptom && styles.modalSymptomMissing]}>
                        {name}
                      </Text>
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
                    <Text style={styles.modalNoteLabel}>NOTE</Text>
                    <Text style={styles.modalNoteText}>{selected.note}</Text>
                  </View>
                ) : null}
              </ScrollView>
              <Pressable style={styles.closeButton} onPress={() => setSelected(null)}>
                <Text style={styles.closeButtonText}>Close</Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  title: {
    fontFamily: 'DMSans_700Bold',
    fontSize: fontSize.xxl,
    color: colors.text,
  },
  subtitle: {
    fontFamily: 'DMSans_400Regular',
    fontSize: fontSize.md,
    color: colors.textMuted,
    marginTop: 2,
  },

  // Calendar strip
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
    fontFamily: 'DMSans_500Medium',
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  calCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  calCircleEmpty: {
    backgroundColor: 'rgba(0,0,0,0.04)',
  },
  calCircleToday: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  calDayNum: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: fontSize.sm,
    color: colors.text,
  },
  calDayNumFilled: {
    color: '#FFFFFF',
  },

  // Empty state
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

  // List
  list: { paddingVertical: spacing.xs, paddingBottom: 100 },
  row: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md,
    marginVertical: spacing.xs,
    borderRadius: radius.md,
    overflow: 'hidden',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  accentBar: { width: 4 },
  rowContent: { flex: 1, padding: spacing.md },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  rowDate: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: fontSize.md,
    color: colors.text,
  },
  chevron: {
    fontSize: fontSize.xl,
    color: colors.textMuted,
  },
  dotsRow: { flexDirection: 'row', gap: 5, flexWrap: 'wrap' },
  dot: { width: 12, height: 12, borderRadius: 6 },
  notePreview: {
    fontFamily: 'DMSans_400Regular',
    fontSize: fontSize.sm,
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
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    paddingTop: spacing.md,
    maxHeight: '70%',
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
    fontFamily: 'DMSans_700Bold',
    fontSize: fontSize.xl,
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
    fontFamily: 'DMSans_500Medium',
    fontSize: fontSize.md,
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
    backgroundColor: colors.background,
    borderRadius: radius.sm,
  },
  modalNoteLabel: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: fontSize.xs,
    color: colors.textMuted,
    letterSpacing: 1.2,
    marginBottom: spacing.xs,
  },
  modalNoteText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: fontSize.md,
    color: colors.text,
    lineHeight: 22,
  },
  closeButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  closeButtonText: {
    fontFamily: 'DMSans_700Bold',
    fontSize: fontSize.md,
    color: '#FFFFFF',
  },
});
