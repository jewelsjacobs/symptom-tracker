import * as Notifications from 'expo-notifications';

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
      title: "Time to log \u{1F30A}",
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
