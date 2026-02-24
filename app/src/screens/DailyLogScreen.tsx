import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
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
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import { colors, spacing, fontSize, radius } from '../theme';
import { loadSettings, loadLog, saveLog, getTodayDateString } from '../storage';
import { AppSettings, DailyLog, LogEntry, SeverityLevel } from '../types';
import { HomeStackParamList } from '../navigation';
import GlassCard from '../components/GlassCard';
import GradientBackground from '../components/GradientBackground';
import SymptomIcon from '../components/SymptomIcon';
import SeverityDots from '../components/SeverityDots';

type NavProp = StackNavigationProp<HomeStackParamList, 'DailyLog'>;

function formatFriendlyDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
}

export default function DailyLogScreen() {
  const navigation = useNavigation<NavProp>();
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
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
            <Text style={styles.backText}>Back</Text>
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Today's Log</Text>
            <Text style={styles.headerDate}>{formatFriendlyDate(today)}</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: 120 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Symptom cards */}
          {settings.symptoms.map((symptom) => (
            <GlassCard key={symptom.id} style={styles.symptomCard}>
              <View style={styles.cardPad}>
                <View style={styles.symptomHeader}>
                  <SymptomIcon name={symptom.name} size={14} color="rgba(255,255,255,0.8)" showBox />
                  <Text style={styles.symptomName}>{symptom.name}</Text>
                </View>
                <SeverityDots
                  value={severities[symptom.id] ?? null}
                  onChange={(level) => selectSeverity(symptom.id, level)}
                  variant="light"
                />
              </View>
            </GlassCard>
          ))}

          {/* Note card */}
          <GlassCard style={styles.symptomCard}>
            <View style={styles.cardPad}>
              <TextInput
                style={styles.noteInput}
                value={note}
                onChangeText={(t) => setNote(t.slice(0, 500))}
                placeholder="Add a note for today... (optional)"
                placeholderTextColor="rgba(255,255,255,0.4)"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
              <Text style={styles.charCount}>{note.length}/500</Text>
            </View>
          </GlassCard>
        </ScrollView>

        {/* Sticky save button */}
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
              <Text style={styles.saveButtonText}>Save Log</Text>
            )}
          </Pressable>
          <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
            <Text style={styles.skipText}>Skip for now</Text>
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
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  backText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: fontSize.md,
    color: 'rgba(255,255,255,0.8)',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: 'DMSans_700Bold',
    fontSize: fontSize.xxl,
    color: '#FFFFFF',
  },
  headerDate: {
    fontFamily: 'DMSans_400Regular',
    fontSize: fontSize.md,
    color: 'rgba(255,255,255,0.65)',
  },
  content: {
    paddingHorizontal: spacing.lg,
  },
  symptomCard: {
    marginBottom: spacing.sm + 4,
  },
  cardPad: {
    padding: spacing.lg,
  },
  symptomHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  symptomName: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: fontSize.lg,
    color: '#FFFFFF',
  },
  noteInput: {
    fontFamily: 'DMSans_400Regular',
    fontSize: fontSize.md,
    color: '#FFFFFF',
    minHeight: 80,
    paddingTop: 0,
  },
  charCount: {
    fontFamily: 'DMSans_400Regular',
    fontSize: fontSize.xs,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'right',
    marginTop: spacing.xs,
  },
  saveContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    alignItems: 'center',
  },
  saveButton: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    borderRadius: 18,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  saveButtonPressed: {
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontFamily: 'DMSans_700Bold',
    fontSize: fontSize.md,
    color: '#FFFFFF',
  },
  skipText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: fontSize.sm,
    color: 'rgba(255,255,255,0.6)',
    marginTop: spacing.sm,
  },
});
