import * as Notifications from 'expo-notifications';
import { scheduleReminder } from '../reminder';

beforeEach(() => jest.clearAllMocks());

test('알림을 끄면 예약을 지우기만 한다', async () => {
  await scheduleReminder(null);
  expect(Notifications.cancelAllScheduledNotificationsAsync).toHaveBeenCalledTimes(1);
  expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
});

test('예전 예약을 지우고 다음 한 번을 날짜로 예약한다', async () => {
  const at = new Date('2026-11-20T19:00:00');
  await scheduleReminder({ at, title: '우리말 곳간', body: '오늘 복습할 문제 4개가 기다려요' });
  expect(Notifications.cancelAllScheduledNotificationsAsync).toHaveBeenCalled();
  expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith({
    content: { title: '우리말 곳간', body: '오늘 복습할 문제 4개가 기다려요' },
    trigger: { type: 'date', date: at, channelId: 'reminder' },
  });
});

test('권한이 없으면 예약하지 않는다', async () => {
  (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValueOnce({ granted: false, canAskAgain: true });
  await scheduleReminder({ at: new Date(), title: 't', body: 'b' });
  expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
});
