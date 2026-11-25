test('Expo Go에서는 expo-notifications를 불러오지 않고 알림을 끈다', async () => {
  jest.resetModules();
  jest.doMock('expo-constants', () => ({ __esModule: true, default: { executionEnvironment: 'storeClient' }, ExecutionEnvironment: { StoreClient: 'storeClient' } }));
  jest.doMock('expo-notifications', () => { throw new Error("Cannot find native module 'ExpoApplication'"); });
  let mod: typeof import('../reminder') | undefined;
  jest.isolateModules(() => { mod = require('../reminder'); });
  await expect(mod!.requestReminderPermission()).resolves.toBe(false);
  await expect(mod!.replaceOwnedReminders([{ id: 'daily', hour: 19, title: 't', body: 'b' }])).resolves.toBeUndefined();
  jest.dontMock('expo-constants');
  jest.dontMock('expo-notifications');
});
