import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import Svg, { Path, Circle as SvgCircle } from 'react-native-svg';

import { colors, spacing, radius, getSymptomColor } from '../theme';

/** Convert hex color to rgba string at given opacity */
function hexToRgba(hex: string, opacity: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${opacity})`;
}
import { saveSettings, getDefaultSettings } from '../storage';
import { Symptom } from '../types';
import { useAppContext } from '../context/AppContext';
import { requestNotificationPermission, scheduleReminder } from '../notifications';
import SymptomIcon from '../components/SymptomIcon';
import CreamBackground from '../components/CreamBackground';
import CoralButton from '../components/CoralButton';
import GlassCard from '../components/GlassCard';
import EbbText from '../components/EbbText';

const SUGGESTIONS = [
  'Pain', 'Fatigue', 'Brain Fog', 'Nausea', 'Headache',
  'Anxiety', 'Dizziness', 'Joint Pain', 'Sleep Quality', 'Mood',
];

const MAX_FREE_SYMPTOMS = 5;

export default function OnboardingScreen() {
  const router = useRouter();
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
    router.replace('/(tabs)/home' as any);
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
        <EbbText type="largeTitle" style={styles.title}>What do you want to track?</EbbText>
        <EbbText type="subhead" style={styles.subtitle}>Pick up to 5. You can always change these later.</EbbText>

        <View style={styles.counterPill}>
          <EbbText type="caption" style={styles.counterText}>★ {selectedCount} / {MAX_FREE_SYMPTOMS} selected</EbbText>
        </View>

        <GlassCard variant="cream" style={styles.chipsCard}>
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
                    size={18}
                    color={getSymptomColor(name)}
                    showBox
                    boxSize={30}
                    boxColor={hexToRgba(getSymptomColor(name), isSelected ? 0.15 : 0.08)}
                  />
                  <EbbText type="footnote" style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                    {name}
                  </EbbText>
                  {isSelected && <EbbText type="caption" style={styles.chipCheck}>✓</EbbText>}
                </Pressable>
              );
            })}
          </View>
        </GlassCard>

        {selectedCount > 0 && (
          <EbbText type="caption" style={styles.deselectHint}>
            {selectedCount} selected · tap any to deselect
          </EbbText>
        )}

        {/* Custom symptoms */}
        <View style={styles.customRow}>
          <TextInput
            allowFontScaling={false}
            style={styles.input}
            value={customInput}
            onChangeText={setCustomInput}
            placeholder="e.g. Heart Rate"
            placeholderTextColor={colors.textMuted}
            returnKeyType="done"
            onSubmitEditing={addCustomSymptom}
          />
          <Pressable style={styles.addBtn} onPress={addCustomSymptom}>
            <EbbText type="button" style={styles.addBtnText}>Add</EbbText>
          </Pressable>
        </View>

        {allSelected
          .filter((s) => !SUGGESTIONS.includes(s))
          .map((name) => (
            <View key={name} style={styles.customTag}>
              <SymptomIcon name={name} size={12} color={colors.primaryDark} />
              <EbbText type="footnote" style={styles.customTagText}>{name}</EbbText>
              <Pressable onPress={() => toggleSuggestion(name)} hitSlop={8} style={styles.customTagRemoveBtn}>
                <EbbText type="footnote" style={styles.customTagRemove}>x</EbbText>
              </Pressable>
            </View>
          ))}
      </ScrollView>
    );
  }

  function renderStep2() {
    return (
      <View style={styles.stepContent}>
        <EbbText type="largeTitle" style={styles.title}>When should we remind you?</EbbText>
        <EbbText type="subhead" style={styles.subtitle}>
          A gentle nudge each day helps build the habit.
        </EbbText>

        <View style={styles.pickerContainer}>
          <EbbText type="caption" style={styles.reminderLabel}>DAILY REMINDER</EbbText>
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
              <EbbText type="headline" style={styles.changeTimeBtnText}>Change time</EbbText>
            </Pressable>
          )}
        </View>
      </View>
    );
  }

  function renderStep3() {
    return (
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Success icon — sage circle with white checkmark */}
        <View style={styles.successIcon}>
          <Svg width={28} height={28} viewBox="0 0 28 28">
            <SvgCircle cx={14} cy={14} r={14} fill={colors.sage} />
            <Path
              d="M8 14 L12 18 L20 10"
              stroke="#FFFFFF"
              strokeWidth={2.5}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </View>

        <EbbText type="largeTitle" style={styles.titleStep3}>You're all set</EbbText>
        <EbbText type="subhead" style={styles.subtitle}>Here's what you'll be tracking:</EbbText>

        <EbbText type="caption" style={styles.sectionLabel}>YOUR SYMPTOMS</EbbText>

        <GlassCard variant="cream" style={styles.symptomListCard}>
          {allSelected.map((name, index) => (
            <View
              key={name}
              style={[
                styles.symptomRow,
                { borderLeftWidth: 3, borderLeftColor: getSymptomColor(name) },
                index < allSelected.length - 1 && styles.symptomRowBorder,
              ]}
            >
              <SymptomIcon name={name} size={16} color={getSymptomColor(name)} />
              <EbbText type="body" style={styles.symptomRowName}>{name}</EbbText>
              <View style={styles.checkCircle}>
                <Svg width={14} height={14} viewBox="0 0 14 14">
                  <SvgCircle cx={7} cy={7} r={6.5} fill={colors.sage} />
                  <Path
                    d="M4 7 L6.2 9.2 L10 5"
                    stroke="#FFFFFF"
                    strokeWidth={1.5}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
              </View>
            </View>
          ))}
        </GlassCard>

        <View style={styles.reminderInfoRow}>
          <Svg width={18} height={18} viewBox="0 0 18 18">
            <Path
              d="M9 2C6.5 2 4.5 4 4.5 6.5V10L3 12H15L13.5 10V6.5C13.5 4 11.5 2 9 2Z"
              stroke={colors.textMuted}
              strokeWidth={1.2}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <Path
              d="M7.5 14C7.5 14.83 8.17 15.5 9 15.5C9.83 15.5 10.5 14.83 10.5 14"
              stroke={colors.textMuted}
              strokeWidth={1.2}
              fill="none"
              strokeLinecap="round"
            />
          </Svg>
          <EbbText type="body" style={styles.reminderInfoText}>
            {reminderEnabled
              ? `Reminder set for ${formatTime(reminderDate)}`
              : 'No reminder set'}
          </EbbText>
        </View>
      </ScrollView>
    );
  }

  return (
    <CreamBackground>
      <SafeAreaView style={styles.container}>
        {renderProgressDots()}

        <View style={styles.content}>
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
        </View>

        {/* Navigation buttons */}
        <View style={styles.navRow}>
          {step === 1 && (
            <CoralButton label="Next →" onPress={goToStep2} style={styles.ctaFull} />
          )}

          {step === 2 && (
            <>
              <CoralButton label="Set Reminder →" onPress={goToStep3} style={styles.ctaFull} />
              <Pressable style={styles.skipBtn} onPress={skipReminder}>
                <EbbText type="body" style={styles.skipBtnText}>Skip for now</EbbText>
              </Pressable>
              <Pressable style={styles.backLink} onPress={() => setStep(1)}>
                <EbbText type="body" style={styles.backLinkText}>Back</EbbText>
              </Pressable>
            </>
          )}

          {step === 3 && (
            <>
              <CoralButton label="Start Tracking →" onPress={startTracking} style={styles.ctaFull} />
              <Pressable style={styles.backLink} onPress={() => setStep(2)}>
                <EbbText type="body" style={styles.backLinkText}>Back</EbbText>
              </Pressable>
            </>
          )}
        </View>
      </SafeAreaView>
    </CreamBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
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
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  stepContent: {
    flex: 1,
    padding: spacing.md,
  },
  title: {
    color: colors.text,
    marginBottom: spacing.sm,
  },
  subtitle: {
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
    fontWeight: '600',
    color: colors.primaryDark,
  },

  // Chip grid
  chipsCard: {
    marginBottom: spacing.sm,
  },
  chipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    padding: spacing.md,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 6,
    width: '47%',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.sm + 2,
    minHeight: 44,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: '#E5E0DD',
    backgroundColor: '#FFFFFF',
  },
  deselectHint: {
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  chipSelected: {
    backgroundColor: '#FADED4',
    borderColor: '#E8725A',
  },
  chipText: {
    fontWeight: '600',
    color: '#2D2926',
  },
  chipTextSelected: {
    color: '#C2553F',
  },
  chipCheck: {
    fontWeight: '700',
    color: '#C2553F',
    marginLeft: -2,
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
    fontFamily: 'System',
    fontSize: 15,
    fontWeight: '400',
    color: colors.text,
  },
  addBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    minHeight: 44,
    justifyContent: 'center',
  },
  addBtnText: {
    color: '#FFFFFF',
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
    fontWeight: '500',
    color: colors.primaryDark,
  },
  customTagRemoveBtn: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: -spacing.md,
    marginVertical: -spacing.xs,
  },
  customTagRemove: {
    fontWeight: '600',
    color: colors.primaryDark,
  },

  // Step 2 — Picker layout
  pickerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: spacing.lg,
  },
  reminderLabel: {
    fontWeight: '600',
    color: colors.textMuted,
    letterSpacing: 1.2,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  changeTimeBtn: {
    alignSelf: 'center',
    padding: spacing.md,
  },
  changeTimeBtnText: {
    color: colors.primary,
  },

  // Step 3 — Confirmation
  successIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.sage,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  titleStep3: {
    color: colors.text,
    marginBottom: spacing.sm,
  },
  sectionLabel: {
    fontWeight: '600',
    color: colors.textMuted,
    letterSpacing: 1.2,
    marginBottom: spacing.sm,
  },
  symptomListCard: {
    marginBottom: spacing.md,
  },
  symptomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
  },
  symptomRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(232,114,90,0.08)',
  },
  symptomRowName: {
    flex: 1,
    fontWeight: '500',
    color: colors.text,
  },
  checkCircle: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reminderInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  reminderInfoText: {
    color: colors.textMuted,
  },

  // Nav buttons
  navRow: {
    alignItems: 'center',
    padding: spacing.md,
    paddingBottom: spacing.md,
  },
  ctaFull: {
    alignSelf: 'stretch',
  },
  skipBtn: {
    padding: spacing.md,
    marginTop: spacing.xs,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  skipBtnText: {
    color: '#7A706B',
  },
  backLink: {
    padding: spacing.sm,
    minHeight: 44,
    justifyContent: 'center',
    marginTop: spacing.xs,
  },
  backLinkText: {
    fontWeight: '500',
    color: colors.textMuted,
  },
});
