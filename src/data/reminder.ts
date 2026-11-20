// 기기 알림 예약(expo-notifications). 서버 푸시 없음: 다음 한 번만 예약해 두고, 앱을 열거나 판을 마칠 때 다시 정한다.
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { planReminder } from '../core/reminder';

const CHANNEL = 'reminder';

// 앱을 보고 있을 때 온 알림도 보이게 한다.
Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
});

async function ensureChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL, { name: '학습 알림', importance: Notifications.AndroidImportance.DEFAULT });
}

// 알림을 켤 때 한 번 묻는다. 거절하면 false.
export async function requestReminderPermission(): Promise<boolean> {
  await ensureChannel();
  const now = await Notifications.getPermissionsAsync();
  if (now.granted) return true;
  if (!now.canAskAgain) return false;
  return (await Notifications.requestPermissionsAsync()).granted;
}

// plan이 null이면 예약을 모두 지운다(알림 끔).
export async function scheduleReminder(plan: ReturnType<typeof planReminder> | null): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!plan) return;
  if (!(await Notifications.getPermissionsAsync()).granted) return;
  await ensureChannel();
  await Notifications.scheduleNotificationAsync({
    content: { title: plan.title, body: plan.body },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: plan.at, channelId: CHANNEL },
  });
}
