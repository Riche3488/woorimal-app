import * as Notifications from 'expo-notifications';
import { replaceOwnedReminders } from '../reminder';
import { reminderPlans, reminderDestination } from '../../core/reminder';
let requests: Map<string, any>;
beforeEach(() => {
  requests = new Map([['unrelated', {
    identifier: 'unrelated',
    content: {
      title: '다른 알림'
    },
    trigger: {}
  }]]);
  (Notifications.getAllScheduledNotificationsAsync as jest.Mock).mockImplementation(async () => [...requests.values()]);
  (Notifications.cancelScheduledNotificationAsync as jest.Mock).mockImplementation(async id => {
    requests.delete(id);
  });
  (Notifications.scheduleNotificationAsync as jest.Mock).mockImplementation(async request => {
    requests.set(request.identifier, request);
    return request.identifier;
  });
});
test('daily_is_one_repeating_trigger_and_refresh_does_not_duplicate_owned_ids', async () => {
  const plans = reminderPlans({
    frequency: 'daily',
    hour: 19
  });
  await replaceOwnedReminders(plans);
  await replaceOwnedReminders(plans);
  const owned = [...requests.values()].filter(r => r.identifier !== 'unrelated');
  expect(owned).toHaveLength(1);
  expect(owned[0].trigger).toMatchObject({
    type: 'daily',
    hour: 19,
    minute: 0
  });
});
test('three_per_week_has_only_mon_wed_fri_and_disable_preserves_other_requests', async () => {
  await replaceOwnedReminders(reminderPlans({
    frequency: 'three-per-week',
    hour: 8
  }));
  expect([...requests.values()].filter(r => r.identifier !== 'unrelated').map(r => r.trigger.weekday)).toEqual([2, 4, 6]);
  await replaceOwnedReminders([]);
  expect([...requests.keys()]).toEqual(['unrelated']);
});
test('permission_denial_removes_only_owned_requests_and_queued_disable_wins', async () => {
  await replaceOwnedReminders(reminderPlans({
    frequency: 'daily',
    hour: 19
  }));
  (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValueOnce({
    granted: false
  });
  await replaceOwnedReminders(reminderPlans({
    frequency: 'daily',
    hour: 19
  }));
  expect([...requests.keys()]).toEqual(['unrelated']);
  await Promise.all([replaceOwnedReminders(reminderPlans({
    frequency: 'daily',
    hour: 8
  })), replaceOwnedReminders([])]);
  expect([...requests.keys()]).toEqual(['unrelated']);
});
test('notification_opens_existing_session_then_due_review_or_home', () => {
  expect(reminderDestination(true, 3)).toBe('/play?mode=resume');
  expect(reminderDestination(false, 3)).toBe('/play?mode=review&count=3');
  expect(reminderDestination(false, 0)).toBe('/');
});
