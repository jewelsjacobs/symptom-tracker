import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
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
import SymptomIcon from '../components/SymptomIcon';

type NavProp = StackNavigationProp<RootStackParamList, 'Onboarding'>;

const SUGGESTIONS = [
  'Pain', 'Fatigue', 'Brain Fog', 'Nausea', 'Headache',
  'Anxiety', 'Dizziness', 'Joint Pain', 'Sleep Quality', 'Mood',
];

const MAX_FREE_SYMPTOMS = 5;

export default function OnboardingScreen() {
  const navigation = useNavigation<NavProp>();
  const { completeOnboarding } = useAppContext();

  const [step, setStep] = useState(1);
  const [selectedSuggestions, setSelectedSuggestions] = useState<string[]>([]);
  const [customInput, setCustomInput] = useState('');

  const defaultReminder = new Date();
  defaultReminder.setHours(20, 0, 0, 0);
  const [reminderDate, setReminderDate] = useState<Date>(defaultReminder);
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [showPicker, setShowPicker] = useState(Platform.OS === 'ios');

  const allSelected = selectedSuggestions;
  const selectedCount = allSelected.length;

  // -- Step 1 handlers --

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

  // -- Step 2 handlers --

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
    await requestNotificationPermission();
    setStep(3);
  }

  // -- Step 3: finish --

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

    completeOnboarding();
    navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
  }

  // -- Helpers --

  function formatTime(date: Date) {
    const h = date.getHours();
    const m = String(date.getMinutes()).padStart(2, '0');
    const ampm = h >= 12 ? 'PM' : 'AM';
    return `${h % 12 || 12}:${m} ${ampm}`;
  }

  function renderProgressDots() {
    return (
      <View style={styles.progressRow}>
        {[1, 2, 3].map((s) => (
          <View key={s} style={[styles.progressDot, step >= s && styles.progressDotActive]} />
        ))}
      </View>
    );
  }

  // -- Step renders --

  function renderStep1() {
    return (
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>What do you want to track?</Text>
        <Text style={styles.subtitle}>Pick up to 5. You can change these later.</Text>

        <View style={styles.counterPill}>
          <Text style={styles.counterText}>{selectedCount} / {MAX_FREE_SYMPTOMS} selected</Text>
        </View>

        <View style={styles.chipsGrid}>
          {SUGGESTIONS.map((name) => {
            const isSelected = selectedSuggestions.includes(name);
            return (
              <Pressable
                key={name}
                onPress={() => toggleSuggestion(name)}
                style={[styles.chip, isSelected && styles.chipSelected]}
              >
                <SymptomIcon
                  name={name}
                  size={14}
                  color={isSelected ? colors.primaryDark : colors.textMuted}
                />
                <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                  {name}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Custom symptoms */}
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
          <Pressable style={styles.addBtn} onPress={addCustomSymptom}>
            <Text style={styles.addBtnText}>Add</Text>
          </Pressable>
        </View>

        {allSelected
          .filter((s) => !SUGGESTIONS.includes(s))
          .map((name) => (
            <View key={name} style={styles.customTag}>
              <SymptomIcon name={name} size={12} color={colors.primaryDark} />
              <Text style={styles.customTagText}>{name}</Text>
              <Pressable onPress={() => toggleSuggestion(name)} hitSlop={8}>
                <Text style={styles.customTagRemove}>x</Text>
              </Pressable>
            </View>
          ))}
      </ScrollView>
    );
  }

  function renderStep2() {
    return (
      <View style={styles.stepContent}>
        <Text style={styles.title}>When should we remind you?</Text>
        <Text style={styles.subtitle}>
          A gentle nudge each day helps build the habit.
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
          <Pressable style={styles.changeTimeBtn} onPress={() => setShowPicker(true)}>
            <Text style={styles.changeTimeBtnText}>Change time</Text>
          </Pressable>
        )}
      </View>
    );
  }

  function renderStep3() {
    return (
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>You're all set</Text>
        <Text style={styles.subtitle}>Here's what you'll be tracking:</Text>

        <View style={styles.summaryCard}>
          {allSelected.map((name) => (
            <View key={name} style={styles.summaryRow}>
              <SymptomIcon name={name} size={14} color={colors.text} showBox />
              <Text style={styles.summaryName}>{name}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.summaryReminder}>
          {reminderEnabled
            ? `Reminder set for ${formatTime(reminderDate)}`
            : 'No reminder set'}
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
          <Pressable style={styles.backBtn} onPress={() => setStep(step - 1)}>
            <Text style={styles.backBtnText}>Back</Text>
          </Pressable>
        )}

        {step === 1 && (
          <Pressable style={styles.nextBtn} onPress={goToStep2}>
            <Text style={styles.nextBtnText}>Next</Text>
          </Pressable>
        )}

        {step === 2 && (
          <View style={styles.step2Btns}>
            <Pressable style={styles.skipBtn} onPress={skipReminder}>
              <Text style={styles.skipBtnText}>Skip for now</Text>
            </Pressable>
            <Pressable style={styles.nextBtn} onPress={goToStep3}>
              <Text style={styles.nextBtnText}>Next</Text>
            </Pressable>
          </View>
        )}

        {step === 3 && (
          <Pressable style={styles.startBtn} onPress={startTracking}>
            <Text style={styles.startBtnText}>Start Tracking</Text>
          </Pressable>
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
  progressDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: 'transparent',
  },
  progressDotActive: {
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
    fontFamily: 'DMSans_700Bold',
    fontSize: fontSize.xxl,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontFamily: 'DMSans_400Regular',
    fontSize: fontSize.md,
    color: colors.textMuted,
    marginBottom: spacing.lg,
    lineHeight: 22,
  },

  // Counter pill
  counterPill: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primaryLight,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginBottom: spacing.md,
  },
  counterText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: fontSize.xs,
    color: colors.primaryDark,
  },

  // Chip grid
  chipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: spacing.lg,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: 'rgba(232,114,90,0.15)',
    backgroundColor: colors.surface,
  },
  chipSelected: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  chipText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  chipTextSelected: {
    color: colors.primaryDark,
  },

  // Custom symptom input
  customRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: spacing.md,
  },
  input: {
    flex: 1,
    height: 44,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(232,114,90,0.15)',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    fontFamily: 'DMSans_400Regular',
    fontSize: fontSize.md,
    color: colors.text,
  },
  addBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
  },
  addBtnText: {
    fontFamily: 'DMSans_700Bold',
    color: '#FFFFFF',
    fontSize: fontSize.md,
  },
  customTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primaryLight,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    alignSelf: 'flex-start',
    marginBottom: spacing.xs,
  },
  customTagText: {
    fontFamily: 'DMSans_500Medium',
    color: colors.primaryDark,
    fontSize: fontSize.sm,
  },
  customTagRemove: {
    fontFamily: 'DMSans_600SemiBold',
    color: colors.primaryDark,
    fontSize: fontSize.sm,
    marginLeft: 2,
  },

  // Step 2
  timeDisplay: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  timeText: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 48,
    color: colors.primary,
  },
  changeTimeBtn: {
    alignSelf: 'center',
    padding: spacing.md,
  },
  changeTimeBtnText: {
    fontFamily: 'DMSans_600SemiBold',
    color: colors.primary,
    fontSize: fontSize.md,
  },

  // Step 3
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  summaryName: {
    fontFamily: 'DMSans_500Medium',
    fontSize: fontSize.md,
    color: colors.text,
  },
  summaryReminder: {
    fontFamily: 'DMSans_400Regular',
    fontSize: fontSize.md,
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
    fontFamily: 'DMSans_500Medium',
    color: colors.textMuted,
    fontSize: fontSize.md,
  },
  nextBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    marginLeft: 'auto',
  },
  nextBtnText: {
    fontFamily: 'DMSans_700Bold',
    color: '#FFFFFF',
    fontSize: fontSize.md,
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
    fontFamily: 'DMSans_400Regular',
    color: colors.textMuted,
    fontSize: fontSize.md,
  },
  startBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  startBtnText: {
    fontFamily: 'DMSans_700Bold',
    color: '#FFFFFF',
    fontSize: fontSize.lg,
  },
});
