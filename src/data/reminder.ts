// 기기 알림 예약(expo-notifications). 앱 소유의 반복 예약을 유지하며 서버 푸시는 쓰지 않는다.
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';
import type { planReminder } from '../core/reminder';
import { REMINDER_OWNER, REMINDER_TITLE, type ReminderPlan } from '../core/reminder';
const CHANNEL = 'reminder';

// Expo Go(SDK 58)에는 expo-notifications가 쓰는 네이티브 모듈(ExpoApplication)이 없어 불러오기만 해도 앱이 멈춘다.
// Expo Go와 웹에서는 알림을 끄고(null), 기기 개발 빌드·EAS 빌드에서만 쓴다.
export const Notifications: typeof import('expo-notifications') | null =
  Platform.OS === 'web' || Constants.executionEnvironment === ExecutionEnvironment.StoreClient ? null : require('expo-notifications');

// 앱을 보고 있을 때 온 알림도 보이게 한다.
Notifications?.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false
  })
});
async function ensureChannel() {
  if (!Notifications || Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL, {
    name: '학습 알림',
    importance: Notifications.AndroidImportance.DEFAULT
  });
}

// 알림을 켤 때 한 번 묻는다. 거절하면 false.
export async function requestReminderPermission(): Promise<boolean> {
  if (!Notifications) return false;
  await ensureChannel();
  const now = await Notifications.getPermissionsAsync();
  if (now.granted) return true;
  if (!now.canAskAgain) return false;
  return (await Notifications.requestPermissionsAsync()).granted;
}

// plan이 null이면 예약을 모두 지운다(알림 끔).
export async function scheduleReminder(plan: ReturnType<typeof planReminder> | null): Promise<void> {
  if (!Notifications) return;
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!plan) return;
  if (!(await Notifications.getPermissionsAsync()).granted) return;
  await ensureChannel();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: plan.title,
      body: plan.body
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: plan.at,
      channelId: CHANNEL
    }
  });
}
let scheduleTail: Promise<unknown> = Promise.resolve();
export function replaceOwnedReminders(plans: ReminderPlan[]): Promise<void> {
  if (!Notifications) return Promise.resolve();
  const task = scheduleTail.then(async () => {
    const allowed = (await Notifications.getPermissionsAsync()).granted;
    const wanted = allowed ? plans : [];
    const requests = await Notifications.getAllScheduledNotificationsAsync();
    const owned = requests.filter(r => r.identifier.startsWith(REMINDER_OWNER + '.') || r.content.data?.owner === REMINDER_OWNER || r.content.title === REMINDER_TITLE && r.trigger && 'channelId' in r.trigger && r.trigger.channelId === CHANNEL);
    const key = (p: ReminderPlan) => `${p.weekday ?? 'daily'}:${p.hour}`;
    if (owned.length === wanted.length && wanted.every(p => owned.some(r => r.identifier === p.id && r.content.data?.reminderPlan === key(p)))) return;
    for (const request of owned) await Notifications.cancelScheduledNotificationAsync(request.identifier);
    if (!wanted.length) return;
    await ensureChannel();
    for (const p of wanted) await Notifications.scheduleNotificationAsync({
      identifier: p.id,
      content: {
        title: p.title,
        body: p.body,
        data: {
          owner: REMINDER_OWNER,
          reminderPlan: key(p)
        }
      },
      trigger: p.weekday === undefined ? {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: p.hour,
        minute: 0,
        channelId: CHANNEL
      } : {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: p.weekday,
        hour: p.hour,
        minute: 0,
        channelId: CHANNEL
      }
    });
  });
  scheduleTail = task.catch(() => {});
  return task;
}
