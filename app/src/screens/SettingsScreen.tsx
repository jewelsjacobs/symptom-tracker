import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';

import { colors, spacing, fontSize, radius } from '../theme';
import { loadSettings, saveSettings } from '../storage';
import { AppSettings, Symptom } from '../types';

// Pull app version from package.json
import pkg from '../../package.json';

const MAX_FREE_SYMPTOMS = 5;

function parseReminderTime(time: string | null): Date {
  const d = new Date();
  if (time) {
    const [h, m] = time.split(':').map(Number);
    d.setHours(h, m, 0, 0);
  } else {
    d.setHours(20, 0, 0, 0);
  }
  return d;
}

function formatTime(date: Date): string {
  const h = date.getHours();
  const m = String(date.getMinutes()).padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${m} ${ampm}`;
}

export default function SettingsScreen() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [newSymptom, setNewSymptom] = useState('');
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [pickerDate, setPickerDate] = useState<Date>(new Date());

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const s = await loadSettings();
        setSettings(s);
        setPickerDate(parseReminderTime(s.reminderTime));
      })();
    }, [])
  );

  async function persist(updated: AppSettings) {
    setSettings(updated);
    await saveSettings(updated);
  }

  // ── Symptoms ──

  async function addSymptom() {
    if (!settings) return;
    const name = newSymptom.trim();
    if (!name) return;

    if (settings.symptoms.length >= MAX_FREE_SYMPTOMS) {
      Alert.alert(
        'Free limit reached',
        `You can track up to ${MAX_FREE_SYMPTOMS} symptoms on the free plan. Premium (coming soon) removes this limit.`
      );
      return;
    }

    if (settings.symptoms.find((s) => s.name.toLowerCase() === name.toLowerCase())) {
      Alert.alert('Already exists', `"${name}" is already in your list.`);
      return;
    }

    const symptom: Symptom = {
      id: Date.now().toString() + Math.random().toString(36).slice(2),
      name,
      createdAt: new Date().toISOString(),
    };

    await persist({ ...settings, symptoms: [...settings.symptoms, symptom] });
    setNewSymptom('');
  }

  async function deleteSymptom(id: string) {
    if (!settings) return;
    Alert.alert(
      'Remove symptom',
      'This will remove the symptom from your list. Past logs are not affected.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await persist({
              ...settings,
              symptoms: settings.symptoms.filter((s) => s.id !== id),
            });
          },
        },
      ]
    );
  }

  // ── Reminder ──

  function onTimeChange(_event: DateTimePickerEvent, date?: Date) {
    if (Platform.OS === 'android') setShowTimePicker(false);
    if (!date || !settings) return;
    setPickerDate(date);

    const h = String(date.getHours()).padStart(2, '0');
    const m = String(date.getMinutes()).padStart(2, '0');
    persist({ ...settings, reminderTime: `${h}:${m}` });
  }

  async function clearReminder() {
    if (!settings) return;
    await persist({ ...settings, reminderTime: null });
  }

  if (!settings) return null;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>

        {/* ── My Symptoms ── */}
        <Text style={styles.sectionTitle}>My Symptoms</Text>
        <View style={styles.card}>
          {settings.symptoms.length === 0 ? (
            <Text style={styles.emptyText}>No symptoms added yet.</Text>
          ) : (
            settings.symptoms.map((symptom) => (
              <View key={symptom.id} style={styles.symptomRow}>
                <Text style={styles.symptomName}>{symptom.name}</Text>
                <TouchableOpacity
                  onPress={() => deleteSymptom(symptom.id)}
                  style={styles.deleteBtn}
                >
                  <Text style={styles.deleteBtnText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))
          )}

          <View style={styles.addRow}>
            <TextInput
              style={styles.input}
              value={newSymptom}
              onChangeText={setNewSymptom}
              placeholder={
                settings.symptoms.length >= MAX_FREE_SYMPTOMS
                  ? 'Premium required for more'
                  : 'Add a symptom…'
              }
              placeholderTextColor={colors.textMuted}
              returnKeyType="done"
              onSubmitEditing={addSymptom}
              editable={settings.symptoms.length < MAX_FREE_SYMPTOMS}
            />
            <TouchableOpacity
              style={[
                styles.addBtn,
                settings.symptoms.length >= MAX_FREE_SYMPTOMS && styles.addBtnDisabled,
              ]}
              onPress={addSymptom}
              disabled={settings.symptoms.length >= MAX_FREE_SYMPTOMS}
            >
              <Text style={styles.addBtnText}>Add</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.hint}>
            {settings.symptoms.length}/{MAX_FREE_SYMPTOMS} symptoms (free plan)
          </Text>
        </View>

        {/* ── Reminder ── */}
        <Text style={styles.sectionTitle}>Daily Reminder</Text>
        <View style={styles.card}>
          <View style={styles.reminderRow}>
            <Text style={styles.reminderValue}>
              {settings.reminderTime
                ? `🔔 ${formatTime(pickerDate)}`
                : '🔕 No reminder set'}
            </Text>
            <View style={styles.reminderActions}>
              <TouchableOpacity
                style={styles.reminderBtn}
                onPress={() => setShowTimePicker(true)}
              >
                <Text style={styles.reminderBtnText}>
                  {settings.reminderTime ? 'Change' : 'Set time'}
                </Text>
              </TouchableOpacity>
              {settings.reminderTime ? (
                <TouchableOpacity style={styles.reminderBtnSecondary} onPress={clearReminder}>
                  <Text style={styles.reminderBtnSecondaryText}>Clear</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          {(showTimePicker || Platform.OS === 'ios') && (
            <DateTimePicker
              value={pickerDate}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onTimeChange}
              textColor={colors.text}
            />
          )}
        </View>

        {/* ── Account ── */}
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.card}>
          <Text style={styles.accountText}>
            {settings.accountEmail ?? 'Not signed in'}
          </Text>
          <Text style={styles.hint}>
            Sign in to enable cloud backup and doctor PDF export (coming soon).
          </Text>
          <TouchableOpacity style={styles.signInBtn}>
            <Text style={styles.signInBtnText}>Sign in / Create account</Text>
          </TouchableOpacity>
        </View>

        {/* ── About ── */}
        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.card}>
          <View style={styles.aboutRow}>
            <Text style={styles.aboutLabel}>App name</Text>
            <Text style={styles.aboutValue}>Ebb</Text>
          </View>
          <View style={styles.aboutRow}>
            <Text style={styles.aboutLabel}>Version</Text>
            <Text style={styles.aboutValue}>{pkg.version}</Text>
          </View>
          <View style={styles.aboutRow}>
            <Text style={styles.aboutLabel}>Tagline</Text>
            <Text style={styles.aboutValue}>Track in 30 seconds a day</Text>
          </View>
        </View>

        <View style={{ height: spacing.xl }} />
      </ScrollView>
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
  content: { padding: spacing.md },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyText: { fontSize: fontSize.md, color: colors.textMuted, paddingVertical: spacing.sm },
  symptomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  symptomName: { fontSize: fontSize.lg, color: colors.text },
  deleteBtn: { padding: spacing.xs },
  deleteBtnText: { fontSize: fontSize.lg, color: colors.danger },
  addRow: { flexDirection: 'row', gap: 8, marginTop: spacing.md },
  input: {
    flex: 1,
    height: 44,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
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
  addBtnDisabled: { backgroundColor: colors.border },
  addBtnText: { color: '#FFFFFF', fontWeight: '600', fontSize: fontSize.lg },
  hint: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: spacing.sm },
  // Reminder
  reminderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reminderValue: { fontSize: fontSize.lg, color: colors.text },
  reminderActions: { flexDirection: 'row', gap: 8 },
  reminderBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  reminderBtnText: { color: '#FFFFFF', fontWeight: '600', fontSize: fontSize.md },
  reminderBtnSecondary: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  reminderBtnSecondaryText: { color: colors.textMuted, fontSize: fontSize.md },
  // Account
  accountText: { fontSize: fontSize.lg, color: colors.text, marginBottom: spacing.xs },
  signInBtn: {
    marginTop: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  signInBtnText: { color: colors.primary, fontWeight: '600', fontSize: fontSize.lg },
  // About
  aboutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  aboutLabel: { fontSize: fontSize.md, color: colors.textMuted },
  aboutValue: { fontSize: fontSize.md, color: colors.text, fontWeight: '600' },
});
