# Coding Spec: Push Notification Reminders
**Task:** Push notification reminders via Expo Notifications  
**Agent Board ID:** task_0037173e3d2b987e  
**Priority:** High — MVP blocker (reminder time saves but never fires)  
**Assigned to:** Claude Code  
**Status:** Ready for implementation

---

## Context

`expo-notifications` is already installed (v0.32.16). The app already:
- Saves `reminderTime` (`"HH:MM"` string) to AsyncStorage via `AppSettings`
- Has a time picker in `OnboardingScreen` (step 2) and `SettingsScreen`
- Never requests notification permission
- Never schedules or cancels a notification

This spec wires it all up.

---

## Files to Create

### `app/src/notifications/index.ts` (new file)

```ts
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/**
 * Request notification permission. Returns true if granted.
 * Safe to call multiple times — won't re-prompt if already decided.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  if (existing === 'denied') return false; // iOS: can't re-prompt, send to Settings

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

/**
 * Schedule (or reschedule) a daily reminder at the given time.
 * Cancels any existing Ebb reminder first.
 * Pass null to cancel without rescheduling.
 *
 * @param time "HH:MM" string or null to cancel
 */
export async function scheduleReminder(time: string | null): Promise<void> {
  // Cancel any existing reminder
  await cancelReminder();

  if (!time) return;

  const [hours, minutes] = time.split(':').map(Number);

  await Notifications.scheduleNotificationAsync({
    identifier: 'ebb-daily-reminder',
    content: {
      title: "Time to log 🌊",
      body: "30 seconds to track how you're feeling today.",
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: hours,
      minute: minutes,
    },
  });
}

/**
 * Cancel the daily Ebb reminder (if one exists).
 */
export async function cancelReminder(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync('ebb-daily-reminder').catch(() => {});
}
```

---

## Files to Modify

### `app/App.tsx`

Add notification handler config at module level (before the component):

```ts
import * as Notifications from 'expo-notifications';

// Show notifications when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});
```

### `app/src/screens/OnboardingScreen.tsx`

1. **Import** at top:
   ```ts
   import { requestNotificationPermission, scheduleReminder } from '../notifications';
   ```

2. **In `goToStep3()`** (user chose to set a reminder — BEFORE advancing to step 3):
   ```ts
   async function goToStep3() {
     setReminderEnabled(true);
     // Request permission now — don't wait until startTracking,
     // so user sees the prompt while still in reminder context
     await requestNotificationPermission();
     setStep(3);
   }
   ```

3. **In `startTracking()`**, after `await saveSettings(settings)`:
   ```ts
   if (reminderEnabled) {
     const h = String(reminderDate.getHours()).padStart(2, '0');
     const m = String(reminderDate.getMinutes()).padStart(2, '0');
     await scheduleReminder(`${h}:${m}`);
   }
   // (no scheduleReminder call needed if reminder was skipped — nothing to schedule)
   ```

### `app/src/screens/SettingsScreen.tsx`

1. **Import** at top:
   ```ts
   import { requestNotificationPermission, scheduleReminder, cancelReminder } from '../notifications';
   ```

2. **Replace `onTimeChange`** to also reschedule:
   ```ts
   async function onTimeChange(_event: DateTimePickerEvent, date?: Date) {
     if (Platform.OS === 'android') setShowTimePicker(false);
     if (!date || !settings) return;
     setPickerDate(date);

     const h = String(date.getHours()).padStart(2, '0');
     const m = String(date.getMinutes()).padStart(2, '0');
     const timeStr = `${h}:${m}`;

     await persist({ ...settings, reminderTime: timeStr });

     // Ensure permission granted, then reschedule
     const granted = await requestNotificationPermission();
     if (granted) {
       await scheduleReminder(timeStr);
     }
   }
   ```

3. **Replace `clearReminder`**:
   ```ts
   async function clearReminder() {
     if (!settings) return;
     await cancelReminder();
     await persist({ ...settings, reminderTime: null });
   }
   ```

4. **In the "Set time" button `onPress`** (opening the picker for the first time):
   - When the user taps "Set time" with no existing reminder, request permission before showing picker:
   ```ts
   onPress={async () => {
     if (!settings?.reminderTime) {
       // First time setting — request permission upfront
       await requestNotificationPermission();
     }
     setShowTimePicker(true);
   }}
   ```

---

## Android Channel (needed for Android builds)

Add to `App.tsx`, inside the `App` component's `useEffect` (or call at app init):

```ts
if (Platform.OS === 'android') {
  Notifications.setNotificationChannelAsync('default', {
    name: 'default',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
  });
}
```

---

## Edge Cases to Handle

| Case | Behavior |
|------|----------|
| User denies permission in onboarding | Skip scheduling silently; `reminderTime` is still saved so user can enable later from Settings |
| User denies permission → goes to Settings → taps "Set time" | `requestNotificationPermission()` returns `false` immediately (iOS won't re-prompt). Show `Alert` telling user to enable in iOS Settings → Notifications → Ebb |
| App is killed and reinstalled | Notification is cleared; re-schedule on next settings load isn't automatic — this is acceptable for MVP |
| `cancelScheduledNotificationAsync` throws if no notification exists | Already handled by `.catch(() => {})` in `cancelReminder` |

### Permission Denied Alert (add to SettingsScreen)

```ts
async function handleSetTimePress() {
  const granted = await requestNotificationPermission();
  if (!granted) {
    Alert.alert(
      'Notifications disabled',
      'To enable reminders, go to Settings → Notifications → Ebb and turn on Allow Notifications.',
      [{ text: 'OK' }]
    );
    return;
  }
  setShowTimePicker(true);
}
```

---

## Testing Checklist

- [ ] Fresh install → onboarding step 2 → tap "Next" → iOS permission prompt appears
- [ ] Set reminder to 2 minutes from now → app goes to background → notification fires
- [ ] Go to Settings → change reminder time → old notification cancelled, new one fires at new time
- [ ] Settings → Clear reminder → no notification fires
- [ ] Deny permission → Settings "Set time" → alert appears with instructions
- [ ] Android: notification channel created, notification shows in system tray

---

## Notes

- This feature requires a **real device** (notifications don't work in Expo Go simulator on iOS)
- Needs an **Expo Dev Build** — confirm `expo-notifications` is in `app.json` plugins:
  ```json
  "plugins": [
    [
      "expo-notifications",
      {
        "icon": "./assets/icon.png",
        "color": "#7C5CBF"
      }
    ]
  ]
  ```
  Add this to `app.json` if not present.
- No push token needed — these are **local notifications** only (no server required)
