import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
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
import SymptomIcon from '../components/SymptomIcon';

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

  const { premium, loading: premiumLoading, refresh: refreshPremium } = usePremium();
  const [exporting, setExporting] = useState(false);

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

  // -- Symptoms --

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

  // -- Reminder --

  async function onTimeChange(_event: DateTimePickerEvent, date?: Date) {
    if (Platform.OS === 'android') setShowTimePicker(false);
    if (!date || !settings) return;
    setPickerDate(date);
    const h = String(date.getHours()).padStart(2, '0');
    const m = String(date.getMinutes()).padStart(2, '0');
    const timeStr = `${h}:${m}`;
    await persist({ ...settings, reminderTime: timeStr });
    const granted = await requestNotificationPermission();
    if (granted) await scheduleReminder(timeStr);
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

  // -- Auth --

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

  // -- Export --

  async function handlePdfExport() {
    if (!settings) return;
    setExporting(true);
    try {
      const logs = await loadAllLogs();
      const to = new Date();
      const from = new Date();
      from.setDate(from.getDate() - 30);
      await exportPdf(settings, logs, from.toISOString().split('T')[0], to.toISOString().split('T')[0]);
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

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* -- My Symptoms -- */}
        <Text style={styles.sectionLabel}>MY SYMPTOMS</Text>
        <View style={styles.card}>
          {settings.symptoms.length === 0 ? (
            <Text style={styles.emptyText}>No symptoms added yet.</Text>
          ) : (
            settings.symptoms.map((symptom) => (
              <View key={symptom.id} style={styles.symptomRow}>
                <SymptomIcon name={symptom.name} size={14} color={colors.text} showBox />
                <Text style={styles.symptomName}>{symptom.name}</Text>
                <Pressable onPress={() => deleteSymptom(symptom.id)} hitSlop={8} style={styles.deleteBtn}>
                  <Text style={styles.deleteBtnText}>x</Text>
                </Pressable>
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
            <Pressable
              style={[
                styles.addBtn,
                (!premium && settings.symptoms.length >= MAX_FREE_SYMPTOMS) && styles.addBtnDisabled,
              ]}
              onPress={addSymptom}
              disabled={!premium && settings.symptoms.length >= MAX_FREE_SYMPTOMS}
            >
              <Text style={styles.addBtnText}>Add</Text>
            </Pressable>
          </View>

          <Text style={styles.hint}>
            {settings.symptoms.length}/{premium ? MAX_PREMIUM_SYMPTOMS : MAX_FREE_SYMPTOMS} symptoms ({premium ? 'premium' : 'free plan'})
          </Text>
        </View>

        {/* -- Reminder -- */}
        <Text style={styles.sectionLabel}>REMINDER</Text>
        <View style={styles.card}>
          <View style={styles.reminderRow}>
            <Text style={styles.reminderValue}>
              {settings.reminderTime ? formatTime(pickerDate) : 'No reminder'}
            </Text>
            <View style={styles.reminderActions}>
              <Pressable
                style={styles.reminderBtn}
                onPress={settings.reminderTime ? () => setShowTimePicker(true) : handleSetTimePress}
              >
                <Text style={styles.reminderBtnText}>
                  {settings.reminderTime ? 'Change' : 'Set one'}
                </Text>
              </Pressable>
              {settings.reminderTime ? (
                <Pressable style={styles.reminderBtnSecondary} onPress={clearReminderTime}>
                  <Text style={styles.reminderBtnSecondaryText}>Clear</Text>
                </Pressable>
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

        {/* -- Account -- */}
        <Text style={styles.sectionLabel}>ACCOUNT</Text>
        <View style={styles.card}>
          {user ? (
            <>
              <Text style={styles.accountEmail}>{user.email}</Text>
              {premium && (
                <View style={styles.premiumBadge}>
                  <Text style={styles.premiumBadgeText}>Premium</Text>
                </View>
              )}
              <Text style={styles.hint}>Your data is backed up to the cloud.</Text>
              <Pressable style={styles.signOutBtn} onPress={handleSignOut}>
                <Text style={styles.signOutBtnText}>Sign out</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={styles.hint}>Sign in to back up your data</Text>
              <Pressable style={styles.signInBtn} onPress={() => setShowAuthModal(true)}>
                <Text style={styles.signInBtnText}>Sign in / Create account</Text>
              </Pressable>
            </>
          )}
        </View>

        {/* -- Premium -- */}
        {!premium && (
          <>
            <Text style={styles.sectionLabel}>PREMIUM</Text>
            <View style={styles.card}>
              {premiumLoading ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <UpgradePrompt onSuccess={refreshPremium} />
              )}
              <Pressable
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
              </Pressable>
            </View>
          </>
        )}

        {/* -- Export -- */}
        <Text style={styles.sectionLabel}>EXPORT</Text>
        <View style={styles.card}>
          <Pressable
            style={styles.exportRow}
            onPress={handleCsvExport}
            disabled={exporting}
          >
            <View>
              <Text style={styles.exportRowTitle}>Export CSV</Text>
              <Text style={styles.exportRowSub}>All your data as a spreadsheet</Text>
            </View>
            <Text style={styles.chevron}>{'\u203A'}</Text>
          </Pressable>

          <View style={styles.divider} />

          <Pressable
            style={styles.exportRow}
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
            <View>
              <Text style={[styles.exportRowTitle, !premium && styles.exportLocked]}>
                Export PDF Report {!premium ? '(Premium)' : ''}
              </Text>
              <Text style={styles.exportRowSub}>For your doctor appointment</Text>
            </View>
            {exporting ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text style={styles.chevron}>{'\u203A'}</Text>
            )}
          </Pressable>
        </View>

        {/* -- About -- */}
        <Text style={styles.sectionLabel}>ABOUT</Text>
        <View style={styles.card}>
          <Text style={styles.aboutName}>Ebb</Text>
          <Text style={styles.aboutVersion}>v{pkg.version}</Text>
          <Text style={styles.aboutTagline}>Track in 30 seconds a day</Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Auth Modal */}
      <Modal visible={showAuthModal} animationType="slide" transparent onRequestClose={() => setShowAuthModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowAuthModal(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <View style={styles.handleBar} />
            <Text style={styles.modalTitle}>
              {authMode === 'signin' ? 'Sign In' : 'Create Account'}
            </Text>

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

            <Pressable
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
            </Pressable>

            <Pressable
              style={styles.authToggle}
              onPress={() => setAuthMode(authMode === 'signin' ? 'signup' : 'signin')}
            >
              <Text style={styles.authToggleText}>
                {authMode === 'signin'
                  ? "Don't have an account? Sign up"
                  : 'Already have an account? Sign in'}
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
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
  content: { paddingHorizontal: spacing.md },
  sectionLabel: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: fontSize.xs,
    color: colors.textMuted,
    letterSpacing: 1.2,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },

  // Symptoms
  emptyText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: fontSize.md,
    color: colors.textMuted,
    paddingVertical: spacing.sm,
  },
  symptomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  symptomName: {
    fontFamily: 'DMSans_500Medium',
    fontSize: fontSize.md,
    color: colors.text,
    flex: 1,
  },
  deleteBtn: { padding: spacing.xs },
  deleteBtnText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: fontSize.lg,
    color: colors.primaryDark,
  },
  addRow: { flexDirection: 'row', gap: 8, marginTop: spacing.md },
  input: {
    flex: 1,
    height: 44,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(232,114,90,0.15)',
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
  addBtnDisabled: { backgroundColor: 'rgba(0,0,0,0.08)' },
  addBtnText: {
    fontFamily: 'DMSans_700Bold',
    color: '#FFFFFF',
    fontSize: fontSize.md,
  },
  hint: {
    fontFamily: 'DMSans_400Regular',
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },

  // Reminder
  reminderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reminderValue: {
    fontFamily: 'DMSans_500Medium',
    fontSize: fontSize.md,
    color: colors.text,
  },
  reminderActions: { flexDirection: 'row', gap: 8 },
  reminderBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  reminderBtnText: {
    fontFamily: 'DMSans_600SemiBold',
    color: '#FFFFFF',
    fontSize: fontSize.sm,
  },
  reminderBtnSecondary: {
    borderWidth: 1,
    borderColor: 'rgba(232,114,90,0.15)',
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  reminderBtnSecondaryText: {
    fontFamily: 'DMSans_500Medium',
    color: colors.textMuted,
    fontSize: fontSize.sm,
  },

  // Account
  accountEmail: {
    fontFamily: 'DMSans_500Medium',
    fontSize: fontSize.md,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  premiumBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primaryLight,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    marginBottom: spacing.xs,
  },
  premiumBadgeText: {
    fontFamily: 'DMSans_700Bold',
    fontSize: fontSize.xs,
    color: colors.primary,
  },
  signInBtn: {
    marginTop: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  signInBtnText: {
    fontFamily: 'DMSans_600SemiBold',
    color: colors.primary,
    fontSize: fontSize.md,
  },
  signOutBtn: {
    marginTop: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.primaryDark,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  signOutBtnText: {
    fontFamily: 'DMSans_600SemiBold',
    color: colors.primaryDark,
    fontSize: fontSize.md,
  },

  // Premium
  restoreBtn: { alignItems: 'center', marginTop: spacing.md, padding: spacing.sm },
  restoreBtnText: {
    fontFamily: 'DMSans_400Regular',
    color: colors.textMuted,
    fontSize: fontSize.xs,
  },

  // Export
  exportRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  exportRowTitle: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: fontSize.md,
    color: colors.text,
  },
  exportLocked: {
    color: colors.textMuted,
  },
  exportRowSub: {
    fontFamily: 'DMSans_400Regular',
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 1,
  },
  chevron: {
    fontSize: fontSize.xl,
    color: colors.textMuted,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.06)',
  },

  // About
  aboutName: {
    fontFamily: 'DMSans_700Bold',
    fontSize: fontSize.lg,
    color: colors.text,
  },
  aboutVersion: {
    fontFamily: 'DMSans_400Regular',
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: 2,
  },
  aboutTagline: {
    fontFamily: 'DMSans_400Regular',
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },

  // Auth Modal
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
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(0,0,0,0.12)',
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    fontFamily: 'DMSans_700Bold',
    fontSize: fontSize.xl,
    color: colors.text,
    marginBottom: spacing.lg,
  },
  authInput: {
    height: 48,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(232,114,90,0.15)',
    paddingHorizontal: spacing.md,
    fontFamily: 'DMSans_400Regular',
    fontSize: fontSize.md,
    color: colors.text,
    marginBottom: spacing.md,
  },
  authSubmitBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  authSubmitBtnText: {
    fontFamily: 'DMSans_700Bold',
    color: '#FFFFFF',
    fontSize: fontSize.md,
  },
  authToggle: { alignItems: 'center', marginTop: spacing.md, padding: spacing.sm },
  authToggleText: {
    fontFamily: 'DMSans_400Regular',
    color: colors.primary,
    fontSize: fontSize.sm,
  },
});
