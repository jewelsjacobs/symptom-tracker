import React, { useCallback, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  Platform,
  Modal,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import Svg, { Path, Rect } from 'react-native-svg';

import { colors, spacing, radius, getSymptomColor } from '../theme';
import { loadSettings, saveSettings, loadAllLogs } from '../storage';
import { AppSettings, Symptom } from '../types';
import { requestNotificationPermission, scheduleReminder, cancelReminder } from '../notifications';
import { signIn, signUp, signOut, getUser } from '../supabase/auth';
import { pushToCloud, pullFromCloud } from '../supabase/sync';
import { usePremium } from '../purchases/usePremium';
import { restorePurchases } from '../purchases';
import { exportPdf } from '../export/generatePdf';
import { exportCsv } from '../export/generateCsv';
import SymptomIcon from '../components/SymptomIcon';
import CreamBackground from '../components/CreamBackground';
import GlassCard from '../components/GlassCard';
import CoralButton from '../components/CoralButton';
import EbbText from '../components/EbbText';

import pkg from '../../package.json';

/** Convert hex color to rgba string at given opacity */
function hexToRgba(hex: string, opacity: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${opacity})`;
}

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

  const router = useRouter();
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

  function onTimeChange(_event: DateTimePickerEvent, date?: Date) {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
      if (!date || !settings) return;
      setPickerDate(date);
      confirmReminderTime(date);
      return;
    }
    // iOS spinner: just update local state, user will tap Done to confirm
    if (!date) return;
    setPickerDate(date);
  }

  async function confirmReminderTime(date: Date) {
    if (!settings) return;
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
    <CreamBackground>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <EbbText type="largeTitle" style={styles.title}>Settings</EbbText>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

          {/* -- My Symptoms -- */}
          <EbbText type="caption" style={styles.sectionLabel}>MY SYMPTOMS</EbbText>
          <GlassCard variant="cream" style={styles.section}>
            <View style={styles.cardPad}>
              {settings.symptoms.length === 0 ? (
                <EbbText type="body" style={styles.emptyText}>No symptoms added yet.</EbbText>
              ) : (
                settings.symptoms.map((symptom, i) => (
                  <View
                    key={symptom.id}
                    style={[
                      styles.symptomRow,
                      i < settings.symptoms.length - 1 && styles.rowBorder,
                    ]}
                  >
                    <SymptomIcon name={symptom.name} size={22} color={getSymptomColor(symptom.name)} showBox boxSize={34} boxColor={hexToRgba(getSymptomColor(symptom.name), 0.15)} />
                    <EbbText type="body" style={styles.symptomName}>{symptom.name}</EbbText>
                    <Pressable onPress={() => deleteSymptom(symptom.id)} hitSlop={8} style={styles.deleteBtn}>
                      <View style={styles.deleteBtnCircle}>
                        <EbbText type="body" style={styles.deleteBtnX}>{'\u00D7'}</EbbText>
                      </View>
                    </Pressable>
                  </View>
                ))
              )}

              <View style={styles.addRow}>
                <TextInput
                  style={styles.addInput}
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
                  onPress={addSymptom}
                  disabled={!premium && settings.symptoms.length >= MAX_FREE_SYMPTOMS}
                >
                  <LinearGradient
                    colors={
                      (!premium && settings.symptoms.length >= MAX_FREE_SYMPTOMS)
                        ? ['rgba(0,0,0,0.08)', 'rgba(0,0,0,0.08)']
                        : ['#E8725A', '#C2553F']
                    }
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.addBtn}
                  >
                    <EbbText type="button" style={styles.addBtnText}>Add</EbbText>
                  </LinearGradient>
                </Pressable>
              </View>

              <EbbText type="caption" style={styles.hint}>
                {settings.symptoms.length}/{premium ? MAX_PREMIUM_SYMPTOMS : MAX_FREE_SYMPTOMS} symptoms ({premium ? 'premium' : 'free plan'})
              </EbbText>
            </View>
          </GlassCard>

          {/* -- Reminder -- */}
          <EbbText type="caption" style={styles.sectionLabel}>REMINDER</EbbText>
          <GlassCard variant="cream" style={styles.section}>
            <View style={styles.cardPad}>
              <View style={styles.reminderRow}>
                <EbbText type="headline" style={styles.reminderTime}>
                  {settings.reminderTime ? formatTime(pickerDate) : 'No reminder'}
                </EbbText>
                <View style={styles.reminderActions}>
                  <Pressable
                    onPress={settings.reminderTime ? () => setShowTimePicker(true) : handleSetTimePress}
                  >
                    <LinearGradient
                      colors={['#E8725A', '#C2553F']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.reminderChangeBtn}
                    >
                      <EbbText type="footnote" style={styles.reminderChangeBtnText}>
                        {settings.reminderTime ? 'Change' : 'Set one'}
                      </EbbText>
                    </LinearGradient>
                  </Pressable>
                  {settings.reminderTime ? (
                    <Pressable style={styles.reminderClearBtn} onPress={clearReminderTime}>
                      <EbbText type="footnote" style={styles.reminderClearBtnText}>Clear</EbbText>
                    </Pressable>
                  ) : null}
                </View>
              </View>

              {showTimePicker && (
                <>
                  <DateTimePicker
                    value={pickerDate}
                    mode="time"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={onTimeChange}
                    textColor={colors.text}
                  />
                  {Platform.OS === 'ios' && (
                    <Pressable
                      onPress={() => {
                        setShowTimePicker(false);
                        confirmReminderTime(pickerDate);
                      }}
                      style={styles.reminderDoneBtn}
                    >
                      <LinearGradient
                        colors={['#E8725A', '#C2553F']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.reminderDoneBtnGradient}
                      >
                        <EbbText type="button" style={styles.reminderDoneBtnText}>Done</EbbText>
                      </LinearGradient>
                    </Pressable>
                  )}
                </>
              )}
            </View>
          </GlassCard>

          {/* -- Subscription -- */}
          <EbbText type="caption" style={styles.sectionLabel}>SUBSCRIPTION</EbbText>
          <GlassCard variant="cream" style={styles.section}>
            <View style={styles.cardPad}>
              {/* Current Plan */}
              <View style={styles.subRow}>
                <EbbText type="body" style={styles.subRowLabel}>Current Plan</EbbText>
                <View style={[styles.planBadge, premium && styles.planBadgePremium]}>
                  <EbbText type="footnote" style={[styles.planBadgeText, premium && styles.planBadgeTextPremium]}>
                    {premium ? 'Premium \u2713' : 'Free'}
                  </EbbText>
                </View>
              </View>

              <View style={styles.divider} />

              {/* Upgrade to Premium */}
              {!premium && (
                <>
                  <Pressable style={styles.subRow} onPress={() => router.push('/paywall')}>
                    <EbbText type="body" style={styles.subRowLabel}>Upgrade to Premium</EbbText>
                    <EbbText type="headline" style={styles.chevron}>{'\u203A'}</EbbText>
                  </Pressable>

                  <View style={styles.divider} />
                </>
              )}

              {/* Restore Purchase */}
              <Pressable
                style={styles.subRow}
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
                <EbbText type="body" style={styles.subRowLabel}>Restore Purchase</EbbText>
                <EbbText type="headline" style={styles.chevron}>{'\u203A'}</EbbText>
              </Pressable>
            </View>
          </GlassCard>

          {/* -- Export -- */}
          <EbbText type="caption" style={styles.sectionLabel}>EXPORT</EbbText>
          <GlassCard variant="cream" style={styles.section}>
            <View style={styles.cardPad}>
              <Pressable
                style={styles.exportRow}
                onPress={handleCsvExport}
                disabled={exporting}
              >
                <View style={[styles.exportIconBox, { backgroundColor: 'rgba(126,184,164,0.15)' }]}>
                  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                    <Rect x="3" y="3" width="18" height="18" rx="3" stroke={colors.sage} strokeWidth={1.8} fill="none" />
                    <Path d="M8 10h8M8 14h5" stroke={colors.sage} strokeWidth={1.8} strokeLinecap="round" />
                  </Svg>
                </View>
                <View style={styles.exportInfo}>
                  <EbbText type="headline" style={styles.exportTitle}>Export CSV</EbbText>
                  <EbbText type="caption" style={styles.exportSub}>All your data as a spreadsheet</EbbText>
                </View>
                <EbbText type="headline" style={styles.chevron}>{'\u203A'}</EbbText>
              </Pressable>

              <View style={styles.divider} />

              <Pressable
                style={styles.exportRow}
                onPress={() => {
                  if (!premium) {
                    Alert.alert(
                      'Premium feature',
                      'PDF export is available with Ebb Premium. Upgrade in the Subscription section above.',
                      [{ text: 'OK' }]
                    );
                    return;
                  }
                  handlePdfExport();
                }}
                disabled={exporting}
              >
                <View style={[styles.exportIconBox, { backgroundColor: 'rgba(232,114,90,0.12)' }]}>
                  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                    <Path
                      d="M6 3h8l5 5v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5a2 2 0 012-2z"
                      stroke={colors.primary}
                      strokeWidth={1.8}
                      fill="none"
                    />
                    <Path d="M14 3v5h5" stroke={colors.primary} strokeWidth={1.8} />
                    <Path d="M9 13h6M9 17h3" stroke={colors.primary} strokeWidth={1.8} strokeLinecap="round" />
                  </Svg>
                </View>
                <View style={styles.exportInfo}>
                  <EbbText type="headline" style={[styles.exportTitle, !premium && styles.exportLocked]}>
                    Export PDF Report {!premium ? '(Premium)' : ''}
                  </EbbText>
                  <EbbText type="caption" style={styles.exportSub}>For your doctor appointment</EbbText>
                </View>
                {exporting ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <EbbText type="headline" style={styles.chevron}>{'\u203A'}</EbbText>
                )}
              </Pressable>
            </View>
          </GlassCard>

          {/* -- About -- */}
          <EbbText type="caption" style={styles.sectionLabel}>ABOUT</EbbText>
          <GlassCard variant="cream" style={styles.section}>
            <View style={styles.cardPad}>
              <EbbText type="headline" style={styles.aboutName}>Ebb</EbbText>
              <EbbText type="footnote" style={styles.aboutVersion}>v{pkg.version}</EbbText>
              <EbbText type="footnote" style={styles.aboutTagline}>Track in 30 seconds a day</EbbText>
              <View style={styles.aboutLinks}>
                <Pressable onPress={() => Linking.openURL('https://ebb.bio/privacy.html')}>
                  <EbbText type="footnote" style={styles.aboutLink}>Privacy Policy</EbbText>
                </Pressable>
                <EbbText type="footnote" style={styles.aboutLinkSep}>{'\u00B7'}</EbbText>
                <Pressable onPress={() => Linking.openURL('https://ebb.bio/terms.html')}>
                  <EbbText type="footnote" style={styles.aboutLink}>Terms of Use</EbbText>
                </Pressable>
                <EbbText type="footnote" style={styles.aboutLinkSep}>{'\u00B7'}</EbbText>
                <Pressable onPress={() => Linking.openURL('https://ebb.bio/support.html')}>
                  <EbbText type="footnote" style={styles.aboutLink}>Support</EbbText>
                </Pressable>
              </View>
            </View>
          </GlassCard>

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Auth Modal */}
        <Modal visible={showAuthModal} animationType="slide" transparent onRequestClose={() => setShowAuthModal(false)}>
          <Pressable style={styles.modalOverlay} onPress={() => setShowAuthModal(false)}>
            <Pressable style={styles.modalSheet} onPress={() => {}}>
              <BlurView intensity={80} tint="light" style={styles.modalBlur}>
                <View style={styles.modalInner}>
                  <View style={styles.handleBar} />
                  <EbbText type="largeTitle" style={styles.modalTitle}>
                    {authMode === 'signin' ? 'Sign In' : 'Create Account'}
                  </EbbText>

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

                  <CoralButton
                    label={authMode === 'signin' ? 'Sign In' : 'Create Account'}
                    onPress={handleAuth}
                    loading={authLoading}
                    disabled={authLoading}
                    style={styles.authSubmitBtn}
                  />

                  <Pressable
                    style={styles.authToggle}
                    onPress={() => setAuthMode(authMode === 'signin' ? 'signup' : 'signin')}
                  >
                    <EbbText type="footnote" style={styles.authToggleText}>
                      {authMode === 'signin'
                        ? "Don't have an account? Sign up"
                        : 'Already have an account? Sign in'}
                    </EbbText>
                  </Pressable>
                </View>
              </BlurView>
            </Pressable>
          </Pressable>
        </Modal>
      </SafeAreaView>
    </CreamBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xs,
  },
  title: {
    color: colors.text,
  },
  content: { paddingHorizontal: spacing.md },
  sectionLabel: {
    fontWeight: '600',
    color: '#7A706B',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginTop: spacing.lg,
    marginBottom: 6,
    marginLeft: spacing.xs,
  },
  section: {
    // GlassCard handles the styling
  },
  cardPad: {
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
  },

  // Symptoms
  emptyText: {
    color: colors.textMuted,
    paddingVertical: spacing.sm,
  },
  symptomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 6,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F0EBE8',
  },
  symptomName: {
    fontWeight: '500',
    color: colors.text,
    flex: 1,
  },
  deleteBtn: {
    padding: spacing.xs,
    minHeight: 44,
    minWidth: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteBtnCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(232,114,90,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteBtnX: {
    fontWeight: '600',
    color: colors.primary,
    marginTop: -1,
  },
  addRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: spacing.md,
  },
  addInput: {
    flex: 1,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.65)',
    borderWidth: 1.5,
    borderColor: 'rgba(194,85,63,0.12)',
    paddingHorizontal: spacing.md,
    fontFamily: 'System',
    fontSize: 15,
    fontWeight: '400',
    color: colors.text,
  },
  addBtn: {
    height: 44,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addBtnText: {
    color: '#FFFFFF',
  },
  hint: {
    color: colors.textMuted,
    marginTop: spacing.sm,
  },

  // Reminder
  reminderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reminderTime: {
    color: colors.primary,
  },
  reminderActions: {
    flexDirection: 'row',
    gap: 8,
  },
  reminderChangeBtn: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md + 2,
    paddingVertical: spacing.sm,
    minHeight: 44,
    justifyContent: 'center',
  },
  reminderChangeBtnText: {
    fontWeight: '600',
    color: '#FFFFFF',
  },
  reminderClearBtn: {
    borderWidth: 1.5,
    borderColor: 'rgba(194,85,63,0.18)',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md + 2,
    paddingVertical: spacing.sm,
    minHeight: 44,
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  reminderClearBtnText: {
    fontWeight: '500',
    color: colors.textMuted,
  },
  reminderDoneBtn: {
    alignSelf: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  reminderDoneBtnGradient: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg + 4,
    paddingVertical: spacing.sm + 2,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reminderDoneBtnText: {
    color: '#FFFFFF',
  },

  // Account
  accountEmail: {
    fontWeight: '500',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  accountHint: {
    color: colors.textMuted,
    marginBottom: spacing.md,
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
    fontWeight: '700',
    color: colors.primary,
  },
  signInBtn: {
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: radius.md,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(232,114,90,0.04)',
  },
  signInBtnText: {
    color: colors.primary,
  },
  signOutBtn: {
    marginTop: spacing.md,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  signOutBtnText: {
    color: '#D64545',
  },

  // Subscription
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
    paddingVertical: 6,
  },
  subRowLabel: {
    color: colors.text,
    fontWeight: '400',
  },
  planBadge: {
    backgroundColor: 'rgba(122,112,107,0.1)',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
  },
  planBadgePremium: {
    backgroundColor: 'rgba(232,114,90,0.12)',
  },
  planBadgeText: {
    fontWeight: '600',
    color: '#7A706B',
  },
  planBadgeTextPremium: {
    color: colors.primary,
  },

  // Export
  exportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 44,
    paddingVertical: 10,
  },
  exportIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  exportInfo: {
    flex: 1,
  },
  exportTitle: {
    color: colors.text,
  },
  exportLocked: {
    color: colors.textMuted,
  },
  exportSub: {
    color: colors.textMuted,
    marginTop: 1,
  },
  chevron: {
    color: colors.textMuted,
  },
  divider: {
    height: 1,
    backgroundColor: '#F0EBE8',
  },

  // About
  aboutName: {
    color: colors.text,
  },
  aboutVersion: {
    color: colors.textMuted,
    marginTop: 2,
  },
  aboutTagline: {
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  aboutLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  aboutLink: {
    color: colors.primary,
  },
  aboutLinkSep: {
    color: colors.textMuted,
  },

  // Auth Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(42,22,11,0.35)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    overflow: 'hidden',
  },
  modalBlur: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    overflow: 'hidden',
  },
  modalInner: {
    backgroundColor: 'rgba(255,255,255,0.88)',
    padding: spacing.lg,
    paddingTop: spacing.md,
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(61,36,22,0.18)',
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    color: colors.text,
    marginBottom: spacing.lg,
  },
  authInput: {
    height: 52,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.65)',
    borderWidth: 1.5,
    borderColor: 'rgba(194,85,63,0.18)',
    paddingHorizontal: spacing.md,
    fontFamily: 'System',
    fontSize: 15,
    fontWeight: '400',
    color: colors.text,
    marginBottom: spacing.md,
  },
  authSubmitBtn: {
    marginTop: spacing.sm,
  },
  authToggle: {
    alignItems: 'center',
    marginTop: spacing.md,
    padding: spacing.sm,
    minHeight: 44,
    justifyContent: 'center',
  },
  authToggleText: {
    color: colors.primaryDark,
  },
});
