# Coding Spec: Supabase Auth + Cloud Sync
**Agent Board ID:** task_a14a85983f2cc59d  
**Priority:** Medium — phase 2, post-TestFlight  
**Assigned to:** Claude Code  
**Depends on:** Nothing (but do after core MVP is stable)

---

## Overview

Add Supabase for:
1. **Email/password auth** — optional sign-in (required for cloud sync + PDF export in future)
2. **Cloud sync** — backup `AppSettings` and `DailyLog` entries to Supabase, sync across devices

Storage strategy: **local-first**. AsyncStorage is source of truth. Supabase syncs in background. App works fully offline.

---

## Before Starting

Julia needs to:
- Create a Supabase project at supabase.com (free tier is fine)
- Copy the project URL and anon key from Project Settings → API
- Create the tables below in Supabase SQL Editor

---

## Database Schema

Run in Supabase SQL Editor:

```sql
-- Users table is managed by Supabase Auth automatically

-- Cloud settings (one row per user)
create table if not exists user_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  symptoms jsonb not null default '[]',
  reminder_time text,
  updated_at timestamptz default now()
);

-- Daily logs (one row per user per date)
create table if not exists daily_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  date text not null,  -- YYYY-MM-DD
  entries jsonb not null default '[]',
  note text,
  updated_at timestamptz default now(),
  unique(user_id, date)
);

-- Enable RLS
alter table user_settings enable row level security;
alter table daily_logs enable row level security;

-- RLS policies: users can only read/write their own data
create policy "Users see own settings" on user_settings for all using (auth.uid() = user_id);
create policy "Users see own logs" on daily_logs for all using (auth.uid() = user_id);
```

---

## Install

```bash
cd ~/projects/symptom-tracker/app
npx expo install @supabase/supabase-js @react-native-async-storage/async-storage react-native-url-polyfill
```

---

## Files to Create

### `app/src/supabase/client.ts`

```ts
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'YOUR_SUPABASE_URL';     // Replace
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY';   // Replace

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

### `app/src/supabase/auth.ts`

```ts
import { supabase } from './client';

export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return data.user;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.user;
}

export async function signOut() {
  await supabase.auth.signOut();
}

export async function getUser() {
  const { data } = await supabase.auth.getUser();
  return data.user;
}
```

### `app/src/supabase/sync.ts`

```ts
import { supabase } from './client';
import { AppSettings, DailyLog } from '../types';
import { loadSettings, saveSettings, loadAllLogs, saveLog } from '../storage';

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
 * Cloud wins for settings; for logs, latest updated_at wins per date.
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
```

---

## UI — `app/src/screens/SettingsScreen.tsx`

Replace the current "Sign in / Create account" button stub with a functional auth screen.

The simplest approach for MVP: a `Modal` with email + password inputs.

```tsx
import { signIn, signUp, signOut, getUser } from '../supabase/auth';
import { pushToCloud, pullFromCloud } from '../supabase/sync';

// State:
const [user, setUser] = useState<any>(null);
const [showAuthModal, setShowAuthModal] = useState(false);
const [authEmail, setAuthEmail] = useState('');
const [authPassword, setAuthPassword] = useState('');
const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
const [authLoading, setAuthLoading] = useState(false);

// On mount (in useFocusEffect):
getUser().then(setUser);

// Auth handler:
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

    // Sync on sign in
    const logs = await loadAllLogs();
    await pushToCloud(settings!, logs);
    await pullFromCloud();
  } catch (e: any) {
    Alert.alert('Error', e.message);
  } finally {
    setAuthLoading(false);
  }
}

async function handleSignOut() {
  await signOut();
  setUser(null);
  await persist({ ...settings!, accountEmail: null });
}
```

The Account card becomes:
```tsx
<View style={styles.card}>
  {user ? (
    <>
      <Text style={styles.accountText}>✅ {user.email}</Text>
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
```

---

## Sync Strategy (MVP)

| Trigger | Action |
|---------|--------|
| Sign in | `pullFromCloud()` then `pushToCloud()` |
| Save daily log | `pushToCloud(settings, [todayLog])` in background (fire-and-forget) |
| Save settings | `pushToCloud(settings, [])` in background |
| App comes to foreground (signed in) | `pullFromCloud()` silently |

All sync calls are fire-and-forget for MVP — no sync status UI needed initially.

---

## Notes

- For MVP: no real-time sync, no conflict resolution UI, no offline queue
- If push fails (offline), data is safe in AsyncStorage — user won't lose anything
- Supabase free tier: 500MB storage, 2GB bandwidth/month — more than enough for this data volume
- Auth emails (confirmation emails) are handled by Supabase automatically
