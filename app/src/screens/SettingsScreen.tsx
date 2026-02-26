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
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import Svg, { Path, Rect } from 'react-native-svg';

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
import CreamBackground from '../components/CreamBackground';
import GlassCard from '../components/GlassCard';
import CoralButton from '../components/CoralButton';

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
    <CreamBackground>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

          {/* -- My Symptoms -- */}
          <Text style={styles.sectionLabel}>MY SYMPTOMS</Text>
          <GlassCard variant="cream" style={styles.section}>
            <View style={styles.cardPad}>
              {settings.symptoms.length === 0 ? (
                <Text style={styles.emptyText}>No symptoms added yet.</Text>
              ) : (
                settings.symptoms.map((symptom, i) => (
                  <View
                    key={symptom.id}
                    style={[
                      styles.symptomRow,
                      i < settings.symptoms.length - 1 && styles.rowBorder,
                    ]}
                  >
                    <SymptomIcon name={symptom.name} size={14} color={colors.text} showBox />
                    <Text style={styles.symptomName}>{symptom.name}</Text>
                    <Pressable onPress={() => deleteSymptom(symptom.id)} hitSlop={8} style={styles.deleteBtn}>
                      <View style={styles.deleteBtnCircle}>
                        <Text style={styles.deleteBtnX}>{'\u00D7'}</Text>
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
                    <Text style={styles.addBtnText}>Add</Text>
                  </LinearGradient>
                </Pressable>
              </View>

              <Text style={styles.hint}>
                {settings.symptoms.length}/{premium ? MAX_PREMIUM_SYMPTOMS : MAX_FREE_SYMPTOMS} symptoms ({premium ? 'premium' : 'free plan'})
              </Text>
            </View>
          </GlassCard>

          {/* -- Reminder -- */}
          <Text style={styles.sectionLabel}>REMINDER</Text>
          <GlassCard variant="cream" style={styles.section}>
            <View style={styles.cardPad}>
              <View style={styles.reminderRow}>
                <Text style={styles.reminderTime}>
                  {settings.reminderTime ? formatTime(pickerDate) : 'No reminder'}
                </Text>
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
                      <Text style={styles.reminderChangeBtnText}>
                        {settings.reminderTime ? 'Change' : 'Set one'}
                      </Text>
                    </LinearGradient>
                  </Pressable>
                  {settings.reminderTime ? (
                    <Pressable style={styles.reminderClearBtn} onPress={clearReminderTime}>
                      <Text style={styles.reminderClearBtnText}>Clear</Text>
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
          </GlassCard>

          {/* -- Account -- */}
          <Text style={styles.sectionLabel}>ACCOUNT</Text>
          <GlassCard variant="cream" style={styles.section}>
            <View style={styles.cardPad}>
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
                  <Text style={styles.accountHint}>Sign in to back up your data</Text>
                  <Pressable style={styles.signInBtn} onPress={() => setShowAuthModal(true)}>
                    <Text style={styles.signInBtnText}>Sign in / Create account</Text>
                  </Pressable>
                </>
              )}
            </View>
          </GlassCard>

          {/* -- Premium -- */}
          {!premium && (
            <>
              <Text style={styles.sectionLabel}>PREMIUM</Text>
              <GlassCard variant="cream" style={styles.section}>
                <View style={styles.cardPad}>
                  <View style={styles.premiumHeader}>
                    <LinearGradient
                      colors={['#E8725A', '#C2553F']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.premiumIconBox}
                    >
                      <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                        <Path
                          d="M12 2L15 9H21L16.5 13.5L18 21L12 17L6 21L7.5 13.5L3 9H9L12 2Z"
                          stroke="#FFFFFF"
                          strokeWidth={1.8}
                          strokeLinejoin="round"
                          fill="none"
                        />
                      </Svg>
                    </LinearGradient>
                    <View style={styles.premiumInfo}>
                      <Text style={styles.premiumTitle}>Ebb Premium</Text>
                      <Text style={styles.premiumSubtitle}>Unlimited history {'\u00B7'} PDF export</Text>
                    </View>
                    <Pressable onPress={() => {}}>
                      <LinearGradient
                        colors={['#E8725A', '#C2553F']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.upgradePill}
                      >
                        <Text style={styles.upgradePillText}>Upgrade</Text>
                      </LinearGradient>
                    </Pressable>
                  </View>
                  {premiumLoading ? (
                    <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.md }} />
                  ) : (
                    <View style={styles.premiumInner}>
                      <UpgradePrompt onSuccess={refreshPremium} />
                    </View>
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
              </GlassCard>
            </>
          )}

          {/* -- Export -- */}
          <Text style={styles.sectionLabel}>EXPORT</Text>
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
                  <Text style={styles.exportTitle}>Export CSV</Text>
                  <Text style={styles.exportSub}>All your data as a spreadsheet</Text>
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
                  <Text style={[styles.exportTitle, !premium && styles.exportLocked]}>
                    Export PDF Report {!premium ? '(Premium)' : ''}
                  </Text>
                  <Text style={styles.exportSub}>For your doctor appointment</Text>
                </View>
                {exporting ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Text style={styles.chevron}>{'\u203A'}</Text>
                )}
              </Pressable>
            </View>
          </GlassCard>

          {/* -- About -- */}
          <Text style={styles.sectionLabel}>ABOUT</Text>
          <GlassCard variant="cream" style={styles.section}>
            <View style={styles.cardPad}>
              <Text style={styles.aboutName}>Ebb</Text>
              <Text style={styles.aboutVersion}>v{pkg.version}</Text>
              <Text style={styles.aboutTagline}>Track in 30 seconds a day</Text>
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
                    <Text style={styles.authToggleText}>
                      {authMode === 'signin'
                        ? "Don't have an account? Sign up"
                        : 'Already have an account? Sign in'}
                    </Text>
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
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  title: {
    fontFamily: 'DMSans_700Bold',
    fontSize: fontSize.xxxl,
    color: colors.text,
  },
  content: { paddingHorizontal: spacing.md },
  sectionLabel: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 10,
    color: colors.textMuted,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  section: {
    // GlassCard handles the styling
  },
  cardPad: {
    padding: spacing.md,
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
    paddingVertical: 12,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  symptomName: {
    fontFamily: 'DMSans_500Medium',
    fontSize: fontSize.md,
    color: colors.text,
    flex: 1,
  },
  deleteBtn: {
    padding: spacing.xs,
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
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 16,
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
    fontFamily: 'DMSans_400Regular',
    fontSize: fontSize.md,
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
  reminderTime: {
    fontFamily: 'DMSans_700Bold',
    fontSize: fontSize.xl,
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
  },
  reminderChangeBtnText: {
    fontFamily: 'DMSans_600SemiBold',
    color: '#FFFFFF',
    fontSize: fontSize.sm,
  },
  reminderClearBtn: {
    borderWidth: 1.5,
    borderColor: 'rgba(194,85,63,0.18)',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md + 2,
    paddingVertical: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  reminderClearBtnText: {
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
  accountHint: {
    fontFamily: 'DMSans_400Regular',
    fontSize: fontSize.md,
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
    fontFamily: 'DMSans_700Bold',
    fontSize: fontSize.xs,
    color: colors.primary,
  },
  signInBtn: {
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(232,114,90,0.04)',
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
    borderRadius: radius.md,
    paddingVertical: 12,
    alignItems: 'center',
  },
  signOutBtnText: {
    fontFamily: 'DMSans_600SemiBold',
    color: colors.primaryDark,
    fontSize: fontSize.md,
  },

  // Premium
  premiumHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  premiumIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  premiumInfo: {
    flex: 1,
  },
  premiumTitle: {
    fontFamily: 'DMSans_700Bold',
    fontSize: fontSize.md,
    color: colors.text,
  },
  premiumSubtitle: {
    fontFamily: 'DMSans_400Regular',
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: 1,
  },
  upgradePill: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  upgradePillText: {
    fontFamily: 'DMSans_700Bold',
    fontSize: fontSize.sm,
    color: '#FFFFFF',
  },
  premiumInner: {
    marginTop: spacing.md,
  },
  restoreBtn: {
    alignItems: 'center',
    marginTop: spacing.md,
    padding: spacing.sm,
  },
  restoreBtnText: {
    fontFamily: 'DMSans_400Regular',
    color: colors.primaryDark,
    fontSize: fontSize.xs,
  },

  // Export
  exportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 12,
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
    fontFamily: 'DMSans_600SemiBold',
    fontSize: fontSize.md,
    color: colors.text,
  },
  exportLocked: {
    color: colors.textMuted,
  },
  exportSub: {
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
    backgroundColor: 'rgba(0,0,0,0.05)',
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
    fontFamily: 'DMSans_700Bold',
    fontSize: 26,
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
    fontFamily: 'DMSans_400Regular',
    fontSize: fontSize.md,
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
  },
  authToggleText: {
    fontFamily: 'DMSans_400Regular',
    color: colors.primaryDark,
    fontSize: fontSize.sm,
  },
});
