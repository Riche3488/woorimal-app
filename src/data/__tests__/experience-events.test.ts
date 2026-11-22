import AsyncStorage from '@react-native-async-storage/async-storage';
import { recordExperienceEvent, setExperienceDiagnostics, clearExperienceDiagnostics, exportExperienceDiagnostics } from '../experience-events';
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
beforeEach(async () => {
  await setExperienceDiagnostics(false);
  await AsyncStorage.clear();
});
test('disabled_records_nothing', async () => {
  await recordExperienceEvent({
    id: 'a',
    at: Date.now(),
    kind: 'session_started'
  });
  expect(JSON.parse(await exportExperienceDiagnostics()).events).toEqual([]);
});
test('disable_clears_buffer', async () => {
  await setExperienceDiagnostics(true);
  await recordExperienceEvent({
    id: 'a',
    at: Date.now(),
    kind: 'session_started'
  });
  expect(JSON.parse(await exportExperienceDiagnostics()).events).toHaveLength(1);
  await setExperienceDiagnostics(false);
  expect(JSON.parse(await exportExperienceDiagnostics())).toMatchObject({
    enabled: false,
    events: []
  });
});
test('explicit_clear_keeps_consent_but_removes_events', async () => {
  await setExperienceDiagnostics(true);
  await recordExperienceEvent({
    id: 'a',
    at: Date.now(),
    kind: 'session_started'
  });
  await clearExperienceDiagnostics();
  expect(JSON.parse(await exportExperienceDiagnostics())).toMatchObject({
    enabled: true,
    events: []
  });
});
