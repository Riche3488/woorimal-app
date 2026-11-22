import { act, render } from '@testing-library/react-native';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { ReminderNavigation } from '../ReminderNavigation';
import { REMINDER_OWNER } from '../../core/reminder';
const mockGame = {
  save: {
    activeSession: null
  },
  counts: {
    due: 0
  }
};
jest.mock('../../state/GameProvider', () => ({
  useGame: () => mockGame
}));
jest.mock('expo-router', () => ({
  router: {
    push: jest.fn()
  }
}));
test('recurring_schedule_routes_each_delivery_once_while_the_process_stays_alive', async () => {
  const response = (date: number) => ({
    notification: {
      date,
      request: {
        identifier: `${REMINDER_OWNER}.daily`,
        trigger: null,
        content: {
          title: null,
          subtitle: null,
          body: null,
          sound: null,
          categoryIdentifier: null,
          threadIdentifier: null,
          data: {
            owner: REMINDER_OWNER
          }
        }
      }
    },
    actionIdentifier: 'default'
  }) as Notifications.NotificationResponse;
  const first = response(1000);
  (Notifications.getLastNotificationResponseAsync as jest.Mock).mockResolvedValueOnce(first);
  await render(<ReminderNavigation />);
  const receive = (Notifications.addNotificationResponseReceivedListener as jest.Mock).mock.calls.at(-1)[0];
  await act(async () => receive(first));
  expect(router.push).toHaveBeenCalledTimes(1);
  mockGame.counts.due = 3;
  await act(async () => receive(response(1000 + 86400000)));
  expect(router.push).toHaveBeenCalledTimes(2);
  expect(router.push).toHaveBeenLastCalledWith('/play?mode=review&count=3');
});
