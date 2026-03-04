import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { colors, spacing, radius, getSymptomColor } from '../theme';
import { loadSettings, loadLog, saveLog, getTodayDateString } from '../storage';
import { AppSettings, DailyLog, LogEntry, SeverityLevel } from '../types';
import GradientBackground from '../components/GradientBackground';
import SymptomIcon from '../components/SymptomIcon';
import SeverityDots from '../components/SeverityDots';
import EbbText from '../components/EbbText';

/** Convert hex color to rgba string at given opacity */
function hexToRgba(hex: string, opacity: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${opacity})`;
}

function formatFriendlyDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
}

export default function DailyLogScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const today = getTodayDateString();

  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [severities, setSeverities] = useState<Record<string, SeverityLevel>>({});
  const [note, setNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const s = await loadSettings();
      setSettings(s);
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

  function selectSeverity(symptomId: string, level: number) {
    setSeverities((prev) => ({ ...prev, [symptomId]: level as SeverityLevel }));
  }

  async function handleSave() {
    if (!settings) return;
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
      const log: DailyLog = { date: today, entries, note: note.trim() || undefined };
      await saveLog(log);
      setTimeout(() => router.back(), 50);
    } catch (e) {
      Alert.alert('Error', 'Failed to save your log. Please try again.');
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  }

  if (!settings) {
    return (
      <GradientBackground>
        <View style={styles.loading}>
          <ActivityIndicator color="#FFFFFF" size="large" />
        </View>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header — stays white on gradient */}
        <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
            <EbbText type="subhead" style={styles.backText}>{'\u2039'} Back</EbbText>
          </Pressable>
          <View style={styles.headerCenter}>
            <EbbText type="largeTitle" style={styles.headerTitle}>Today's Log</EbbText>
            <EbbText type="subhead" style={styles.headerDate}>{formatFriendlyDate(today)}</EbbText>
          </View>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: 120 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Symptom cards — solid white */}
          {settings.symptoms.map((symptom) => {
            const symptomColor = getSymptomColor(symptom.name);
            return (
              <View key={symptom.id} style={[styles.whiteCard, styles.symptomCard]}>
                <View style={styles.cardPad}>
                  <View style={styles.symptomHeader}>
                    <SymptomIcon
                      name={symptom.name}
                      size={22}
                      color={symptomColor}
                      showBox
                      boxSize={34}
                      boxColor={hexToRgba(symptomColor, 0.15)}
                    />
                    <EbbText type="headline" style={styles.symptomName}>{symptom.name}</EbbText>
                  </View>
                  <SeverityDots
                    value={severities[symptom.id] ?? null}
                    onChange={(level) => selectSeverity(symptom.id, level)}
                    variant="dark"
                  />
                </View>
              </View>
            );
          })}

          {/* Note card — solid white */}
          <View style={[styles.whiteCard, styles.symptomCard]}>
            <View style={styles.cardPad}>
              <TextInput
                allowFontScaling={false}
                style={styles.noteInput}
                value={note}
                onChangeText={(t) => setNote(t.slice(0, 500))}
                placeholder="Add a note... (optional)"
                placeholderTextColor="#B5ADA8"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
              <EbbText type="caption" style={styles.charCount}>{note.length}/500</EbbText>
            </View>
          </View>
        </ScrollView>

        {/* Sticky save button — solid coral */}
        <View style={[styles.saveContainer, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
          <Pressable
            style={({ pressed }) => [
              styles.saveButton,
              isSaving && styles.saveButtonDisabled,
              pressed && !isSaving && styles.saveButtonPressed,
            ]}
            onPress={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <EbbText type="button" style={styles.saveButtonText}>Save Log</EbbText>
            )}
          </Pressable>
          <Pressable onPress={() => router.back()} hitSlop={8} style={styles.skipBtn}>
            <EbbText type="footnote" style={styles.skipText}>Skip for now</EbbText>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  backBtn: {
    minHeight: 44,
    minWidth: 44,
    justifyContent: 'center',
  },
  backText: {
    fontWeight: '500',
    color: '#FFFFFF',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
  },
  headerDate: {
    color: 'rgba(255,255,255,0.8)',
  },
  content: {
    paddingHorizontal: spacing.md,
  },

  // Solid white card — replaces GlassCard
  whiteCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    shadowColor: 'rgba(0,0,0,0.08)',
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 16,
    shadowOpacity: 1,
    elevation: 4,
  },
  symptomCard: {
    marginBottom: 12,
  },
  cardPad: {
    padding: spacing.md,
  },

  // Dark text on white cards
  symptomHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  symptomName: {
    color: colors.text,
  },
  noteInput: {
    fontFamily: 'System',
    fontSize: 15,
    fontWeight: '400',
    color: colors.text,
    minHeight: 80,
    backgroundColor: '#F5F1EE',
    borderWidth: 1,
    borderColor: '#E5E0DD',
    borderRadius: 12,
    padding: 12,
  },
  charCount: {
    color: colors.textMuted,
    textAlign: 'right',
    marginTop: spacing.xs,
  },

  // Save button — solid coral
  saveContainer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    alignItems: 'center',
  },
  saveButton: {
    backgroundColor: '#E8725A',
    borderRadius: 18,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    shadowColor: 'rgba(0,0,0,0.15)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 4,
  },
  saveButtonPressed: {
    backgroundColor: '#C2553F',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#FFFFFF',
  },
  skipBtn: {
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  skipText: {
    color: 'rgba(255,255,255,0.7)',
    marginTop: spacing.sm,
  },
});
