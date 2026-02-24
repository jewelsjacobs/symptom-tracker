import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

import { colors, severity as severityColors, spacing, fontSize, radius } from '../theme';
import { loadAllLogs, loadSettings } from '../storage';
import { AppSettings, DailyLog, SeverityLevel } from '../types';
import { usePremium } from '../purchases/usePremium';

const HISTORY_FREE_DAYS = 30;

function formatFriendlyDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function isToday(dateStr: string): boolean {
  const d = new Date();
  const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return dateStr === today;
}

/** Average severity across all entries in a log */
function avgSeverity(log: DailyLog): number {
  if (!log.entries.length) return 0;
  return log.entries.reduce((sum, e) => sum + e.severity, 0) / log.entries.length;
}

export default function HistoryScreen() {
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [selected, setSelected] = useState<DailyLog | null>(null);
  const { premium } = usePremium();

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

  function getRowColor(log: DailyLog): string {
    const avg = avgSeverity(log);
    if (avg >= 4) return severityColors[4];
    if (avg >= 3) return severityColors[2];
    return severityColors[0];
  }

  function renderDots(log: DailyLog) {
    return (
      <View style={styles.dotsRow}>
        {log.entries.map((entry) => (
          <View
            key={entry.symptomId}
            style={[
              styles.dot,
              { backgroundColor: severityColors[(entry.severity as SeverityLevel) - 1] },
            ]}
          />
        ))}
      </View>
    );
  }

  function renderDetailModal() {
    if (!selected || !settings) return null;
    return (
      <Modal
        visible={!!selected}
        animationType="slide"
        transparent
        onRequestClose={() => setSelected(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{formatFriendlyDate(selected.date)}</Text>
              <TouchableOpacity onPress={() => setSelected(null)}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView>
              {selected.entries.map((entry) => {
                const symptom = settings.symptoms.find((s) => s.id === entry.symptomId);
                const name = symptom?.name ?? 'Unknown symptom';
                return (
                  <View key={entry.symptomId} style={styles.modalRow}>
                    <Text style={[styles.modalSymptomName, !symptom && { color: colors.textMuted, fontStyle: 'italic' }]}>
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
                                  : colors.border,
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
                  <Text style={styles.modalNoteLabel}>Note</Text>
                  <Text style={styles.modalNoteText}>{selected.note}</Text>
                </View>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>History</Text>
        <Text style={styles.subtitle}>{logs.length} days logged</Text>
      </View>

      {logs.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No logs yet.{'\n'}Start tracking today! 🌱</Text>
        </View>
      ) : (
        <FlatList
          data={logs}
          keyExtractor={(item) => item.date}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.row}
              onPress={() => setSelected(item)}
              activeOpacity={0.7}
            >
              <View style={[styles.colorBar, { backgroundColor: getRowColor(item) }]} />
              <View style={styles.rowContent}>
                <View style={styles.rowTop}>
                  <Text style={styles.rowDate}>
                    {isToday(item.date) ? '📅 Today' : formatFriendlyDate(item.date)}
                  </Text>
                  <Text style={styles.chevron}>›</Text>
                </View>
                {renderDots(item)}
                {item.note ? (
                  <Text style={styles.notePreview} numberOfLines={1}>
                    📝 {item.note}
                  </Text>
                ) : null}
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      {renderDetailModal()}
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
  subtitle: { fontSize: fontSize.md, color: colors.textMuted, marginTop: 2 },
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
  list: { paddingVertical: spacing.sm },
  row: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    marginHorizontal: spacing.md,
    marginVertical: spacing.xs,
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  colorBar: { width: 5 },
  rowContent: { flex: 1, padding: spacing.md },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  rowDate: { fontSize: fontSize.lg, fontWeight: '600', color: colors.text },
  chevron: { fontSize: fontSize.xl, color: colors.textMuted },
  dotsRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  dot: { width: 14, height: 14, borderRadius: 7 },
  notePreview: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
    fontStyle: 'italic',
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text },
  closeBtn: { fontSize: fontSize.xl, color: colors.textMuted, padding: spacing.xs },
  modalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalSymptomName: { fontSize: fontSize.lg, color: colors.text, flex: 1 },
  modalDotsRow: { flexDirection: 'row', gap: 5 },
  modalDot: { width: 14, height: 14, borderRadius: 7 },
  modalNote: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.background,
    borderRadius: radius.sm,
  },
  modalNoteLabel: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  modalNoteText: { fontSize: fontSize.lg, color: colors.text, lineHeight: 22 },
});
