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
  Modal,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';

import { colors, spacing, fontSize, radius } from '../theme';
import { loadSettings, saveSettings, loadAllLogs } from '../storage';
import { AppSettings, Symptom } from '../types';
import { requestNotificationPermission, scheduleReminder, cancelReminder } from '../notifications';
import { signIn, signUp, signOut, getUser } from '../supabase/auth';
import { pushToCloud, pullFromCloud } from '../supabase/sync';
import { usePremium } from '../purchases/usePremium';
import { restorePurchases } from '../purchases';
import UpgradePrompt from '../components/UpgradePrompt';
import { exportPdf } from '../export/generatePdf';
import { exportCsv } from '../export/generateCsv';

// Pull app version from package.json
import pkg from '../../package.json';

const MAX_FREE_SYMPTOMS = 5;
const MAX_PREMIUM_SYMPTOMS = 20;

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

  // Premium
  const { premium, loading: premiumLoading, refresh: refreshPremium } = usePremium();
  const [exporting, setExporting] = useState(false);

  // Auth state
  const [user, setUser] = useState<{ email?: string } | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [authLoading, setAuthLoading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const s = await loadSettings();
        setSettings(s);
        setPickerDate(parseReminderTime(s.reminderTime));
        const u = await getUser();
        setUser(u);
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

    const limit = premium ? MAX_PREMIUM_SYMPTOMS : MAX_FREE_SYMPTOMS;
    if (settings.symptoms.length >= limit) {
      if (!premium) {
        Alert.alert(
          'Free limit reached',
          `You can track up to ${MAX_FREE_SYMPTOMS} symptoms on the free plan. Upgrade to Premium for up to ${MAX_PREMIUM_SYMPTOMS}.`
        );
      }
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

  async function onTimeChange(_event: DateTimePickerEvent, date?: Date) {
    if (Platform.OS === 'android') setShowTimePicker(false);
    if (!date || !settings) return;
    setPickerDate(date);

    const h = String(date.getHours()).padStart(2, '0');
    const m = String(date.getMinutes()).padStart(2, '0');
    const timeStr = `${h}:${m}`;

    await persist({ ...settings, reminderTime: timeStr });

    const granted = await requestNotificationPermission();
    if (granted) {
      await scheduleReminder(timeStr);
    }
  }

  async function clearReminderTime() {
    if (!settings) return;
    await cancelReminder();
    await persist({ ...settings, reminderTime: null });
  }

  async function handleSetTimePress() {
    const granted = await requestNotificationPermission();
    if (!granted) {
      Alert.alert(
        'Notifications disabled',
        'To enable reminders, go to Settings \u2192 Notifications \u2192 Ebb and turn on Allow Notifications.',
        [{ text: 'OK' }]
      );
      return;
    }
    setShowTimePicker(true);
  }

  // ── Auth ──

  async function handleAuth() {
    if (!authEmail || !authPassword) return;
    setAuthLoading(true);
    try {
      const u = authMode === 'signup'
        ? await signUp(authEmail, authPassword)
        : await signIn(authEmail, authPassword);

      setUser(u);
      await persist({ ...settings!, accountEmail: authEmail });
      setShowAuthModal(false);
      setAuthEmail('');
      setAuthPassword('');

      // Sync on sign in
      const logs = await loadAllLogs();
      await pushToCloud(settings!, logs);
      await pullFromCloud();
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Authentication failed');
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleSignOut() {
    await signOut();
    setUser(null);
    await persist({ ...settings!, accountEmail: null });
  }

  // ── Export ──

  async function handlePdfExport() {
    if (!settings) return;
    setExporting(true);
    try {
      const logs = await loadAllLogs();
      const to = new Date();
      const from = new Date();
      from.setDate(from.getDate() - 30);
      const fromStr = from.toISOString().split('T')[0];
      const toStr = to.toISOString().split('T')[0];
      await exportPdf(settings, logs, fromStr, toStr);
    } catch {
      Alert.alert('Export failed', 'Could not generate PDF. Please try again.');
    } finally {
      setExporting(false);
    }
  }

  async function handleCsvExport() {
    if (!settings) return;
    setExporting(true);
    try {
      const logs = await loadAllLogs();
      await exportCsv(settings, logs);
    } catch {
      Alert.alert('Export failed', 'Could not export data. Please try again.');
    } finally {
      setExporting(false);
    }
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
                !premium && settings.symptoms.length >= MAX_FREE_SYMPTOMS
                  ? 'Upgrade to Premium for more'
                  : 'Add a symptom\u2026'
              }
              placeholderTextColor={colors.textMuted}
              returnKeyType="done"
              onSubmitEditing={addSymptom}
              editable={premium || settings.symptoms.length < MAX_FREE_SYMPTOMS}
            />
            <TouchableOpacity
              style={[
                styles.addBtn,
                !premium && settings.symptoms.length >= MAX_FREE_SYMPTOMS && styles.addBtnDisabled,
              ]}
              onPress={addSymptom}
              disabled={!premium && settings.symptoms.length >= MAX_FREE_SYMPTOMS}
            >
              <Text style={styles.addBtnText}>Add</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.hint}>
            {settings.symptoms.length}/{premium ? MAX_PREMIUM_SYMPTOMS : MAX_FREE_SYMPTOMS} symptoms ({premium ? 'premium' : 'free plan'})
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
                onPress={settings.reminderTime ? () => setShowTimePicker(true) : handleSetTimePress}
              >
                <Text style={styles.reminderBtnText}>
                  {settings.reminderTime ? 'Change' : 'Set time'}
                </Text>
              </TouchableOpacity>
              {settings.reminderTime ? (
                <TouchableOpacity style={styles.reminderBtnSecondary} onPress={clearReminderTime}>
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

        {/* ── Premium ── */}
        <Text style={styles.sectionTitle}>Premium</Text>
        <View style={styles.card}>
          {premiumLoading ? (
            <ActivityIndicator color={colors.primary} />
          ) : premium ? (
            <>
              <Text style={styles.premiumActive}>Premium Active</Text>
              <Text style={styles.hint}>Unlimited symptoms, full history, PDF export</Text>
            </>
          ) : (
            <UpgradePrompt onSuccess={refreshPremium} />
          )}
          <TouchableOpacity
            style={styles.restoreBtn}
            onPress={async () => {
              const restored = await restorePurchases();
              if (restored) {
                refreshPremium();
                Alert.alert('Restored!', 'Your Premium subscription has been restored.');
              } else {
                Alert.alert('Nothing to restore', 'No previous Premium purchase found.');
              }
            }}
          >
            <Text style={styles.restoreBtnText}>Restore purchase</Text>
          </TouchableOpacity>
        </View>

        {/* ── Account ── */}
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.card}>
          {user ? (
            <>
              <Text style={styles.accountText}>{user.email}</Text>
              <Text style={styles.hint}>Your data is backed up to the cloud.</Text>
              <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
                <Text style={styles.signOutBtnText}>Sign out</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.hint}>Sign in to sync across devices and enable PDF export.</Text>
              <TouchableOpacity style={styles.signInBtn} onPress={() => setShowAuthModal(true)}>
                <Text style={styles.signInBtnText}>Sign in / Create account</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Auth Modal */}
        <Modal visible={showAuthModal} animationType="slide" transparent onRequestClose={() => setShowAuthModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {authMode === 'signin' ? 'Sign In' : 'Create Account'}
                </Text>
                <TouchableOpacity onPress={() => setShowAuthModal(false)}>
                  <Text style={styles.closeBtn}>✕</Text>
                </TouchableOpacity>
              </View>

              <TextInput
                style={styles.authInput}
                value={authEmail}
                onChangeText={setAuthEmail}
                placeholder="Email"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                keyboardType="email-address"
                textContentType="emailAddress"
              />
              <TextInput
                style={styles.authInput}
                value={authPassword}
                onChangeText={setAuthPassword}
                placeholder="Password"
                placeholderTextColor={colors.textMuted}
                secureTextEntry
                textContentType="password"
              />

              <TouchableOpacity
                style={[styles.authSubmitBtn, authLoading && { opacity: 0.6 }]}
                onPress={handleAuth}
                disabled={authLoading}
              >
                {authLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.authSubmitBtnText}>
                    {authMode === 'signin' ? 'Sign In' : 'Create Account'}
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.authToggle}
                onPress={() => setAuthMode(authMode === 'signin' ? 'signup' : 'signin')}
              >
                <Text style={styles.authToggleText}>
                  {authMode === 'signin'
                    ? "Don't have an account? Sign up"
                    : 'Already have an account? Sign in'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* ── Export ── */}
        <Text style={styles.sectionTitle}>Export</Text>
        <View style={styles.card}>
          <TouchableOpacity
            style={[styles.exportBtn, !premium && styles.exportBtnLocked]}
            onPress={() => {
              if (!premium) {
                Alert.alert(
                  'Premium feature',
                  'PDF export is available with Ebb Premium. Upgrade in the Premium section above.',
                  [{ text: 'OK' }]
                );
                return;
              }
              handlePdfExport();
            }}
            disabled={exporting}
          >
            {exporting ? (
              <ActivityIndicator color={premium ? '#fff' : colors.primary} />
            ) : (
              <>
                <Text style={[styles.exportBtnText, !premium && styles.exportBtnTextLocked]}>
                  {premium ? 'Export PDF Report' : 'PDF Report (Premium)'}
                </Text>
                <Text style={styles.exportBtnSub}>For your doctor appointment</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.exportBtn, styles.exportBtnSecondary]}
            onPress={handleCsvExport}
            disabled={exporting}
          >
            <Text style={styles.exportBtnTextSecondary}>Export CSV</Text>
            <Text style={styles.exportBtnSub}>All your data as a spreadsheet</Text>
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
  signOutBtn: {
    marginTop: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.danger,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  signOutBtnText: { color: colors.danger, fontWeight: '600', fontSize: fontSize.lg },
  // Auth Modal
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
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text },
  closeBtn: { fontSize: fontSize.xl, color: colors.textMuted, padding: spacing.xs },
  authInput: {
    height: 48,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    fontSize: fontSize.lg,
    color: colors.text,
    marginBottom: spacing.md,
  },
  authSubmitBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  authSubmitBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: fontSize.lg },
  authToggle: { alignItems: 'center', marginTop: spacing.md, padding: spacing.sm },
  authToggleText: { color: colors.primary, fontSize: fontSize.md },
  // Premium
  premiumActive: { fontSize: fontSize.lg, fontWeight: '700', color: colors.primary, marginBottom: spacing.xs },
  restoreBtn: { alignItems: 'center', marginTop: spacing.md, padding: spacing.sm },
  restoreBtnText: { color: colors.textMuted, fontSize: fontSize.sm },
  // Export
  exportBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  exportBtnLocked: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  exportBtnText: { color: '#fff', fontWeight: '700', fontSize: fontSize.md },
  exportBtnTextLocked: { color: colors.textMuted },
  exportBtnSecondary: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  exportBtnTextSecondary: { color: colors.primary, fontWeight: '600', fontSize: fontSize.md },
  exportBtnSub: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: 2 },
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
