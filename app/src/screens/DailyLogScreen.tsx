import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import { colors, severity as severityColors, spacing, fontSize, radius } from '../theme';
import { loadSettings, loadLog, saveLog, getTodayDateString } from '../storage';
import { AppSettings, DailyLog, LogEntry, SeverityLevel } from '../types';
import { HomeStackParamList } from '../navigation';

type NavProp = StackNavigationProp<HomeStackParamList, 'DailyLog'>;

function formatFriendlyDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

export default function DailyLogScreen() {
  const navigation = useNavigation<NavProp>();
  const today = getTodayDateString();

  const [settings, setSettings] = useState<AppSettings | null>(null);
  // Map of symptomId → selected severity
  const [severities, setSeverities] = useState<Record<string, SeverityLevel>>({});
  const [note, setNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const s = await loadSettings();
      setSettings(s);

      // Pre-fill with any existing log for today
      const existing = await loadLog(today);
      if (existing) {
        const map: Record<string, SeverityLevel> = {};
        for (const entry of existing.entries) {
          map[entry.symptomId] = entry.severity;
        }
        setSeverities(map);
        setNote(existing.note ?? '');
      }
    })();
  }, [today]);

  function selectSeverity(symptomId: string, level: SeverityLevel) {
    setSeverities((prev) => ({ ...prev, [symptomId]: level }));
  }

  async function handleSave() {
    if (!settings) return;

    // Validate: all symptoms must have a rating
    const unrated = settings.symptoms.filter((s) => !severities[s.id]);
    if (unrated.length > 0) {
      Alert.alert(
        'Almost done!',
        `Please rate ${unrated.map((s) => s.name).join(', ')} before saving.`
      );
      return;
    }

    setIsSaving(true);
    try {
      const entries: LogEntry[] = settings.symptoms.map((s) => ({
        symptomId: s.id,
        severity: severities[s.id],
      }));

      const log: DailyLog = {
        date: today,
        entries,
        note: note.trim() || undefined,
      };

      await saveLog(log);
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', 'Failed to save your log. Please try again.');
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  }

  if (!settings) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Today's Log</Text>
          <Text style={styles.headerDate}>{formatFriendlyDate(today)}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Symptom cards */}
        {settings.symptoms.map((symptom) => {
          const selected = severities[symptom.id];
          return (
            <View key={symptom.id} style={styles.card}>
              <Text style={styles.symptomName}>{symptom.name}</Text>
              <View style={styles.dotsRow}>
                {([1, 2, 3, 4, 5] as SeverityLevel[]).map((level) => {
                  const isSelected = selected === level;
                  return (
                    <TouchableOpacity
                      key={level}
                      onPress={() => selectSeverity(symptom.id, level)}
                      style={[
                        styles.dotButton,
                        isSelected && styles.dotButtonSelected,
                        { borderColor: severityColors[level - 1] },
                        isSelected && { backgroundColor: severityColors[level - 1] },
                      ]}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.dotLabel, isSelected && styles.dotLabelSelected]}>
                        {level}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <View style={styles.severityLabels}>
                <Text style={styles.severityLabelText}>Mild</Text>
                <Text style={styles.severityLabelText}>Severe</Text>
              </View>
            </View>
          );
        })}

        {/* Note */}
        <View style={styles.noteCard}>
          <Text style={styles.noteLabel}>Add a note (optional)</Text>
          <TextInput
            style={styles.noteInput}
            value={note}
            onChangeText={setNote}
            placeholder="How are you feeling overall? Any triggers today?"
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        {/* Bottom padding so save button doesn't overlap content */}
        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Sticky save button */}
      <View style={styles.saveContainer}>
        <TouchableOpacity
          style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={isSaving}
          activeOpacity={0.8}
        >
          {isSaving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.saveButtonText}>Save Log ✓</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.md,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: spacing.xs,
  },
  backText: {
    color: colors.primary,
    fontSize: fontSize.lg,
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
  },
  headerDate: {
    fontSize: fontSize.md,
    color: colors.textMuted,
  },
  content: {
    padding: spacing.lg,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  symptomName: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.md,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dotButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.card,
  },
  dotButtonSelected: {
    transform: [{ scale: 1.15 }],
  },
  dotLabel: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.textMuted,
  },
  dotLabelSelected: {
    color: '#FFFFFF',
  },
  severityLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  severityLabelText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  noteCard: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  noteLabel: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  noteInput: {
    fontSize: fontSize.lg,
    color: colors.text,
    minHeight: 80,
    paddingTop: 0,
  },
  saveContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.md,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: fontSize.xl,
    fontWeight: '700',
  },
});
