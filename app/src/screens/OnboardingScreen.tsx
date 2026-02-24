import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import { colors, spacing, fontSize, radius } from '../theme';
import { saveSettings, getDefaultSettings } from '../storage';
import { Symptom } from '../types';
import { RootStackParamList, useAppContext } from '../navigation';
import { requestNotificationPermission, scheduleReminder } from '../notifications';

type NavProp = StackNavigationProp<RootStackParamList, 'Onboarding'>;

const SUGGESTIONS = [
  'Pain', 'Fatigue', 'Brain Fog', 'Nausea', 'Headache',
  'Anxiety', 'Dizziness', 'Joint Pain', 'Sleep Quality', 'Mood',
];

const MAX_FREE_SYMPTOMS = 5;

export default function OnboardingScreen() {
  const navigation = useNavigation<NavProp>();
  const { completeOnboarding } = useAppContext();

  // Wizard state
  const [step, setStep] = useState(1);

  // Step 1: symptom selection
  const [selectedSuggestions, setSelectedSuggestions] = useState<string[]>([]);
  const [customInput, setCustomInput] = useState('');

  // Step 2: reminder
  const defaultReminder = new Date();
  defaultReminder.setHours(20, 0, 0, 0); // 8pm default
  const [reminderDate, setReminderDate] = useState<Date>(defaultReminder);
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [showPicker, setShowPicker] = useState(Platform.OS === 'ios');

  // Derived: all selected symptoms (suggestions + custom)
  const allSelected = selectedSuggestions;
  const selectedCount = allSelected.length;

  // ── Step 1 handlers ──

  function toggleSuggestion(name: string) {
    if (selectedSuggestions.includes(name)) {
      setSelectedSuggestions(selectedSuggestions.filter((s) => s !== name));
    } else {
      if (selectedCount >= MAX_FREE_SYMPTOMS) {
        Alert.alert('Free limit', `You can track up to ${MAX_FREE_SYMPTOMS} symptoms on the free plan.`);
        return;
      }
      setSelectedSuggestions([...selectedSuggestions, name]);
    }
  }

  function addCustomSymptom() {
    const name = customInput.trim();
    if (!name) return;
    if (selectedSuggestions.includes(name)) {
      Alert.alert('Already added', `"${name}" is already in your list.`);
      return;
    }
    if (selectedCount >= MAX_FREE_SYMPTOMS) {
      Alert.alert('Free limit', `You can track up to ${MAX_FREE_SYMPTOMS} symptoms on the free plan.`);
      return;
    }
    setSelectedSuggestions([...selectedSuggestions, name]);
    setCustomInput('');
  }

  function goToStep2() {
    if (selectedCount === 0) {
      Alert.alert('Pick at least one', 'Please select at least one symptom to track.');
      return;
    }
    setStep(2);
  }

  // ── Step 2 handlers ──

  function onTimeChange(_event: DateTimePickerEvent, date?: Date) {
    if (Platform.OS === 'android') setShowPicker(false);
    if (date) setReminderDate(date);
  }

  function skipReminder() {
    setReminderEnabled(false);
    setStep(3);
  }

  async function goToStep3() {
    setReminderEnabled(true);
    // Request permission now so user sees the prompt while still in reminder context
    await requestNotificationPermission();
    setStep(3);
  }

  // ── Step 3: finish ──

  async function startTracking() {
    const symptoms: Symptom[] = allSelected.map((name) => ({
      id: Date.now().toString() + Math.random().toString(36).slice(2),
      name,
      createdAt: new Date().toISOString(),
    }));

    let reminderTime: string | null = null;
    if (reminderEnabled) {
      const h = String(reminderDate.getHours()).padStart(2, '0');
      const m = String(reminderDate.getMinutes()).padStart(2, '0');
      reminderTime = `${h}:${m}`;
    }

    const settings = getDefaultSettings();
    settings.symptoms = symptoms;
    settings.reminderTime = reminderTime;
    settings.hasCompletedOnboarding = true;

    await saveSettings(settings);

    if (reminderEnabled && reminderTime) {
      await scheduleReminder(reminderTime);
    }

    // Signal RootNavigator context so it updates its initialRoute state,
    // then navigate to the Main screen in the root stack.
    completeOnboarding();
    navigation.reset({
      index: 0,
      routes: [{ name: 'Main' }],
    });
  }

  // ── Render helpers ──

  function renderProgressDots() {
    return (
      <View style={styles.progressRow}>
        {[1, 2, 3].map((s) => (
          <View key={s} style={[styles.dot, step >= s && styles.dotActive]} />
        ))}
      </View>
    );
  }

  function formatTime(date: Date) {
    const h = date.getHours();
    const m = String(date.getMinutes()).padStart(2, '0');
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${m} ${ampm}`;
  }

  // ── Step renders ──

  function renderStep1() {
    return (
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>What do you want to track?</Text>
        <Text style={styles.subtitle}>
          Select up to 5 symptoms. You can change these later in Settings.
        </Text>
        <Text style={styles.countLabel}>{selectedCount}/{MAX_FREE_SYMPTOMS} selected</Text>

        <View style={styles.chipsRow}>
          {SUGGESTIONS.map((name) => {
            const selected = selectedSuggestions.includes(name);
            return (
              <TouchableOpacity
                key={name}
                onPress={() => toggleSuggestion(name)}
                style={[styles.chip, selected && styles.chipSelected]}
              >
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                  {name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.sectionLabel}>Or add your own:</Text>
        <View style={styles.customRow}>
          <TextInput
            style={styles.input}
            value={customInput}
            onChangeText={setCustomInput}
            placeholder="e.g. Heart Rate"
            placeholderTextColor={colors.textMuted}
            returnKeyType="done"
            onSubmitEditing={addCustomSymptom}
          />
          <TouchableOpacity style={styles.addBtn} onPress={addCustomSymptom}>
            <Text style={styles.addBtnText}>Add</Text>
          </TouchableOpacity>
        </View>

        {/* Show custom (non-suggestion) symptoms */}
        {allSelected
          .filter((s) => !SUGGESTIONS.includes(s))
          .map((name) => (
            <View key={name} style={styles.customTag}>
              <Text style={styles.customTagText}>{name}</Text>
              <TouchableOpacity onPress={() => toggleSuggestion(name)}>
                <Text style={styles.removeText}> ✕</Text>
              </TouchableOpacity>
            </View>
          ))}
      </ScrollView>
    );
  }

  function renderStep2() {
    return (
      <View style={styles.stepContent}>
        <Text style={styles.title}>Set a daily reminder</Text>
        <Text style={styles.subtitle}>
          A gentle nudge each day helps build the habit. You can skip this for now.
        </Text>

        <View style={styles.timeDisplay}>
          <Text style={styles.timeText}>{formatTime(reminderDate)}</Text>
        </View>

        {(Platform.OS === 'ios' || showPicker) && (
          <DateTimePicker
            value={reminderDate}
            mode="time"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onTimeChange}
            textColor={colors.text}
          />
        )}

        {Platform.OS === 'android' && !showPicker && (
          <TouchableOpacity
            style={styles.changeTimeBtn}
            onPress={() => setShowPicker(true)}
          >
            <Text style={styles.changeTimeBtnText}>Change time</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  function renderStep3() {
    return (
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.emoji}>🎉</Text>
        <Text style={styles.title}>You're all set!</Text>
        <Text style={styles.subtitle}>Here's what you'll be tracking:</Text>

        <View style={styles.summaryBox}>
          {allSelected.map((name) => (
            <Text key={name} style={styles.summaryItem}>• {name}</Text>
          ))}
        </View>

        <Text style={styles.summaryReminder}>
          {reminderEnabled
            ? `📅 Daily reminder at ${formatTime(reminderDate)}`
            : '🔕 No daily reminder'}
        </Text>
      </ScrollView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {renderProgressDots()}

      <View style={styles.content}>
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
      </View>

      {/* Navigation buttons */}
      <View style={styles.navRow}>
        {step > 1 && (
          <TouchableOpacity style={styles.backBtn} onPress={() => setStep(step - 1)}>
            <Text style={styles.backBtnText}>← Back</Text>
          </TouchableOpacity>
        )}

        {step === 1 && (
          <TouchableOpacity style={styles.nextBtn} onPress={goToStep2}>
            <Text style={styles.nextBtnText}>Next →</Text>
          </TouchableOpacity>
        )}

        {step === 2 && (
          <View style={styles.step2Btns}>
            <TouchableOpacity style={styles.skipBtn} onPress={skipReminder}>
              <Text style={styles.skipBtnText}>Skip</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.nextBtn} onPress={goToStep3}>
              <Text style={styles.nextBtnText}>Next →</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 3 && (
          <TouchableOpacity style={styles.startBtn} onPress={startTracking}>
            <Text style={styles.startBtnText}>Start Tracking 🚀</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.border,
  },
  dotActive: {
    backgroundColor: colors.primary,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  stepContent: {
    flex: 1,
    padding: spacing.lg,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: fontSize.lg,
    color: colors.textMuted,
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  countLabel: {
    fontSize: fontSize.md,
    color: colors.primary,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: spacing.lg,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: fontSize.md,
    color: colors.text,
  },
  chipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  sectionLabel: {
    fontSize: fontSize.md,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  customRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: spacing.md,
  },
  input: {
    flex: 1,
    height: 44,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingHorizontal: spacing.md,
    fontSize: fontSize.lg,
    color: colors.text,
  },
  addBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
  },
  addBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: fontSize.lg,
  },
  customTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    alignSelf: 'flex-start',
    marginBottom: spacing.xs,
  },
  customTagText: {
    color: '#FFFFFF',
    fontSize: fontSize.md,
  },
  removeText: {
    color: '#FFFFFF',
    fontSize: fontSize.md,
  },
  // Step 2
  timeDisplay: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  timeText: {
    fontSize: fontSize.xxxl,
    fontWeight: '700',
    color: colors.primary,
  },
  changeTimeBtn: {
    alignSelf: 'center',
    padding: spacing.md,
  },
  changeTimeBtnText: {
    color: colors.primary,
    fontSize: fontSize.lg,
  },
  // Step 3
  emoji: {
    fontSize: 48,
    textAlign: 'center',
    marginVertical: spacing.lg,
  },
  summaryBox: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryItem: {
    fontSize: fontSize.lg,
    color: colors.text,
    paddingVertical: spacing.xs,
  },
  summaryReminder: {
    fontSize: fontSize.lg,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  // Nav buttons
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    paddingBottom: spacing.md,
  },
  backBtn: {
    padding: spacing.md,
  },
  backBtnText: {
    color: colors.textMuted,
    fontSize: fontSize.lg,
  },
  nextBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  nextBtnText: {
    color: '#FFFFFF',
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  step2Btns: {
    flexDirection: 'row',
    gap: spacing.md,
    marginLeft: 'auto',
  },
  skipBtn: {
    padding: spacing.md,
    justifyContent: 'center',
  },
  skipBtnText: {
    color: colors.textMuted,
    fontSize: fontSize.lg,
  },
  startBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  startBtnText: {
    color: '#FFFFFF',
    fontSize: fontSize.xl,
    fontWeight: '700',
  },
});
