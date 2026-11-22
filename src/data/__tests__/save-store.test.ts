import { createSaveStore } from '../save-store';
import { defaultSave } from '../save';
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
test('writes_are_serial_and_use_latest_state', async () => {
  let release!: () => void;
  const gate = new Promise<void>(resolve => {
    release = resolve;
  });
  const writes: number[] = [];
  const store = createSaveStore(defaultSave(), async d => {
    if (!writes.length) await gate;
    writes.push(d.totalGrains);
  });
  const a = store.update(d => ({
    ...d,
    totalGrains: d.totalGrains + 10
  }));
  const b = store.update(d => ({
    ...d,
    totalGrains: d.totalGrains + 20
  }));
  release();
  await a;
  expect((await b).totalGrains).toBe(30);
  expect(writes).toEqual([10, 30]);
});
test('failed_write_does_not_advance_committed_state_and_retry_applies_once', async () => {
  let fail = true;
  const store = createSaveStore(defaultSave(), async () => {
    if (fail) throw new Error('disk');
  });
  const add = (d: ReturnType<typeof defaultSave>) => ({
    ...d,
    totalGrains: d.totalGrains + 10
  });
  await expect(store.update(add)).rejects.toThrow('disk');
  expect(store.current().totalGrains).toBe(0);
  fail = false;
  expect((await store.update(add)).totalGrains).toBe(10);
  await store.flush();
});
