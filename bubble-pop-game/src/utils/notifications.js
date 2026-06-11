import { Platform } from 'react-native';

// Daily local reminder at 19:00 — the single highest-impact retention lever.
// Copy escalates with the streak so the loss-aversion hook gets stronger
// the longer someone plays. Fails silently anywhere notifications are
// unavailable (web, denied permission, Expo Go edge cases).
export async function scheduleStreakReminder(streak) {
  if (Platform.OS === 'web') return;
  try {
    const Notifications = require('expo-notifications');

    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') return;

    await Notifications.cancelAllScheduledNotificationsAsync();

    const content = streak >= 2
      ? {
          title: `🔥 Your ${streak}-day streak is on the line!`,
          body: 'One round of Drop Merge keeps it alive — and your streak bonus grows.',
        }
      : {
          title: '🧩 Your tiles are waiting',
          body: 'Beat your high score and climb the global leaderboard.',
        };

    await Notifications.scheduleNotificationAsync({
      content,
      trigger: { hour: 19, minute: 0, repeats: true },
    });
  } catch {}
}
