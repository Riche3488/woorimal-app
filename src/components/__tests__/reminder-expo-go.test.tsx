import { render } from '@testing-library/react-native';
import { ReminderNavigation } from '../ReminderNavigation';
import { requestReminderPermission, scheduleReminder, replaceOwnedReminders } from '../../data/reminder';
import { reminderPlans } from '../../core/reminder';

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { executionEnvironment: 'storeClient' },
  ExecutionEnvironment: { StoreClient: 'storeClient' }
}));
jest.mock('expo-notifications', () => {
  throw new Error("Cannot find native module 'ExpoApplication'");
});
jest.mock('expo-router', () => ({ router: { push: jest.fn(), replace: jest.fn() }, usePathname: () => '/' }));
jest.mock('../../state/GameProvider', () => ({
  useGame: () => ({ save: { activeSession: null }, counts: { due: 0 } })
}));

test('Expo_Go_mount_and_all_reminder_entry_points_skip_the_unavailable_native_module', async () => {
  await render(<ReminderNavigation />);
  await expect(requestReminderPermission()).resolves.toBe(false);
  await expect(scheduleReminder({ at: new Date(), title: 'title', body: 'body' })).resolves.toBeUndefined();
  await expect(replaceOwnedReminders(reminderPlans({ frequency: 'daily', hour: 19 }))).resolves.toBeUndefined();
  await expect(replaceOwnedReminders([])).resolves.toBeUndefined();
});
