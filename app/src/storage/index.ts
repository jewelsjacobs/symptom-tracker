import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppSettings, DailyLog } from '../types';

const SETTINGS_KEY = '@symptom_tracker_settings';
const LOG_KEY_PREFIX = '@symptom_tracker_log_';

/** Returns YYYY-MM-DD for today's local date */
export function getTodayDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Default app settings for a brand-new install */
export function getDefaultSettings(): AppSettings {
  return {
    symptoms: [],
    reminderTime: null,
    hasCompletedOnboarding: false,
    accountEmail: null,
  };
}

/** Load app settings from storage. Returns defaults if nothing stored. */
export async function loadSettings(): Promise<AppSettings> {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    if (raw) {
      return JSON.parse(raw) as AppSettings;
    }
  } catch (e) {
    console.warn('[storage] Failed to load settings:', e);
  }
  return getDefaultSettings();
}

/** Persist app settings to storage */
export async function saveSettings(settings: AppSettings): Promise<void> {
  try {
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.warn('[storage] Failed to save settings:', e);
    throw e;
  }
}

/** Load the daily log for a specific date (YYYY-MM-DD). Returns null if not found. */
export async function loadLog(date: string): Promise<DailyLog | null> {
  try {
    const raw = await AsyncStorage.getItem(LOG_KEY_PREFIX + date);
    if (raw) {
      return JSON.parse(raw) as DailyLog;
    }
  } catch (e) {
    console.warn('[storage] Failed to load log for', date, ':', e);
  }
  return null;
}

/** Persist a daily log entry */
export async function saveLog(log: DailyLog): Promise<void> {
  try {
    await AsyncStorage.setItem(LOG_KEY_PREFIX + log.date, JSON.stringify(log));
  } catch (e) {
    console.warn('[storage] Failed to save log for', log.date, ':', e);
    throw e;
  }
}

/**
 * Load all stored daily logs, sorted newest first.
 * Scans AsyncStorage keys for our log prefix.
 */
export async function loadAllLogs(): Promise<DailyLog[]> {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const logKeys = allKeys.filter((k) => k.startsWith(LOG_KEY_PREFIX));
    if (logKeys.length === 0) return [];

    const pairs = await AsyncStorage.multiGet(logKeys);
    const logs: DailyLog[] = [];

    for (const [, value] of pairs) {
      if (value) {
        try {
          logs.push(JSON.parse(value) as DailyLog);
        } catch {
          // skip corrupt entries
        }
      }
    }

    // Sort newest first
    logs.sort((a, b) => b.date.localeCompare(a.date));
    return logs;
  } catch (e) {
    console.warn('[storage] Failed to load all logs:', e);
    return [];
  }
}
