import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('react-native', () => ({ Platform: { OS: 'web' } }));
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { executionEnvironment: 'standalone' },
  ExecutionEnvironment: { StoreClient: 'storeClient' }
}));
jest.mock('expo-notifications', () => { throw new Error('native notifications unavailable on web'); });
jest.mock('expo-file-system', () => { throw new Error('native file system unavailable on web'); });

test('web_reminders_do_not_load_the_native_module_or_register_listeners', async () => {
  const reminder: typeof import('../reminder') = require('../reminder');
  expect(reminder.Notifications).toBeNull();
  await expect(reminder.requestReminderPermission()).resolves.toBe(false);
  await expect(reminder.replaceOwnedReminders([{ id: 'daily', hour: 19, title: 'title', body: 'body' }])).resolves.toBeUndefined();
});

test('web_pack_cache_roundtrips_without_native_files_and_falls_back_when_browser_storage_fails', async () => {
  const { fileCache, loadPack }: typeof import('../pack-store') = require('../pack-store');
  await fileCache.write('{"version":"cached"}');
  expect(await fileCache.read()).toBe('{"version":"cached"}');
  (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(new Error('storage unavailable'));
  expect((await loadPack()).questions.length).toBeGreaterThan(0);
});
