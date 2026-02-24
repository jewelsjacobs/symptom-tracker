import { supabase } from './client';
import { AppSettings, DailyLog } from '../types';
import { loadSettings, saveSettings, saveLog } from '../storage';

/**
 * Push local data up to Supabase. Call after sign-in and after each save.
 */
export async function pushToCloud(settings: AppSettings, logs: DailyLog[]): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // Upsert settings
  await supabase.from('user_settings').upsert({
    user_id: user.id,
    symptoms: settings.symptoms,
    reminder_time: settings.reminderTime,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' });

  // Upsert each log
  const logRows = logs.map((log) => ({
    user_id: user.id,
    date: log.date,
    entries: log.entries,
    note: log.note ?? null,
    updated_at: new Date().toISOString(),
  }));

  if (logRows.length > 0) {
    await supabase.from('daily_logs').upsert(logRows, { onConflict: 'user_id,date' });
  }
}

/**
 * Pull cloud data down and merge into local storage.
 * Cloud wins for settings; for logs, cloud data overwrites local per date.
 */
export async function pullFromCloud(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // Pull settings
  const { data: remoteSettings } = await supabase
    .from('user_settings')
    .select('symptoms, reminder_time')
    .eq('user_id', user.id)
    .single();

  if (remoteSettings) {
    const local = await loadSettings();
    await saveSettings({
      ...local,
      symptoms: remoteSettings.symptoms,
      reminderTime: remoteSettings.reminder_time,
    });
  }

  // Pull logs
  const { data: remoteLogs } = await supabase
    .from('daily_logs')
    .select('date, entries, note')
    .eq('user_id', user.id);

  if (remoteLogs) {
    for (const row of remoteLogs) {
      await saveLog({
        date: row.date,
        entries: row.entries,
        note: row.note ?? undefined,
      });
    }
  }
}
