import AsyncStorage from '@react-native-async-storage/async-storage';
import { joinSave, PART_COUNT, partKey, splitSave } from '../save-shards';
import { backupBrokenSave, createSaveWriter, defaultSave, loadSaveResult, SAVE_KEY, writeSave, type SaveData } from '../save';
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
beforeEach(() => AsyncStorage.clear());

// 모든 문제를 푼 사용자 크기(문제 6천여 개·도감 4천여 낱말)를 흉내 낸다.
function bigSave(n = 6200): SaveData {
  const d = defaultSave();
  const stats: SaveData['progress']['stats'] = {};
  const discoveries: SaveData['discoveries'] = {};
  for (let i = 0; i < n; i++) {
    stats[`meaning:${i}`] = { seen: 12, correct: 9, lastAt: 1_800_000_000_000, needsReview: false, box: 3, dueDay: '2026-12-01', wrong: 3, mastered: true, lastAnswer: '아무개답' };
    if (i % 3) discoveries[`낱말${i}`] = { word: `낱말${i}`, at: 1_800_000_000_000, explain: '가'.repeat(100), masteredAt: 1_800_000_000_000 };
  }
  return { ...d, progress: { ...d.progress, stats }, discoveries };
}

test('나눈 저장을 다시 합치면 원래와 같다', () => {
  const save = bigSave(300);
  const { main, parts } = splitSave(save);
  expect(parts).toHaveLength(PART_COUNT);
  expect(JSON.parse(main).progress.stats).toEqual({});
  expect(JSON.parse(main).discoveries).toEqual({});
  expect(joinSave(JSON.parse(main), parts.map(p => JSON.parse(p)))).toEqual(save);
});

test('큰 기록도 한 값이 Android 한 행 한도(2MB)보다 훨씬 작다', () => {
  const { main, parts } = splitSave(bigSave());
  for (const text of [main, ...parts]) expect(text.length).toBeLessThan(300_000);
});

test('writeSave로 쓴 나눈 저장을 그대로 불러온다', async () => {
  const save = bigSave(200);
  await writeSave(save);
  expect(await AsyncStorage.getItem(partKey(0))).not.toBeNull();
  const loaded = await loadSaveResult();
  expect(loaded.kind).toBe('loaded');
  if (loaded.kind !== 'loaded') return;
  expect(loaded.save.progress.stats).toEqual(save.progress.stats);
  expect(loaded.save.discoveries).toEqual(save.discoveries);
  expect('parts' in loaded.save).toBe(false);
});

test('예전 한 키 저장도 읽고, 다음 저장 때 나눈 형식으로 옮긴다', async () => {
  const save = bigSave(50);
  await AsyncStorage.setItem(SAVE_KEY, JSON.stringify(save));
  const loaded = await loadSaveResult();
  expect(loaded.kind === 'loaded' && loaded.save.progress.stats).toEqual(save.progress.stats);
  await createSaveWriter()(save);
  expect(JSON.parse((await AsyncStorage.getItem(SAVE_KEY))!).progress.stats).toEqual({});
  const again = await loadSaveResult();
  expect(again.kind === 'loaded' && again.save.progress.stats).toEqual(save.progress.stats);
});

test('조각과 본 키를 한 번에(조각 먼저, 본 키 마지막) 쓰고, 다음부터는 바뀐 조각만 쓴다', async () => {
  const write = createSaveWriter();
  const save = bigSave(400);
  const multiSet = AsyncStorage.multiSet as jest.Mock;
  multiSet.mockClear();
  await write(save);
  expect(multiSet).toHaveBeenCalledTimes(1);
  const first = multiSet.mock.calls[0][0] as [string, string][];
  expect(first).toHaveLength(PART_COUNT + 1);
  expect(first[first.length - 1][0]).toBe(SAVE_KEY);
  const changed = { ...save, totalGrains: 5, progress: { ...save.progress, stats: { ...save.progress.stats, 'meaning:7': { ...save.progress.stats['meaning:7'], seen: 99 } } } };
  await write(changed);
  const second = multiSet.mock.calls[1][0] as [string, string][];
  expect(second.map(([k]) => k)).toEqual([expect.stringMatching(/\.part\.\d+$/), SAVE_KEY]);
  const loaded = await loadSaveResult();
  expect(loaded.kind === 'loaded' && loaded.save.progress.stats['meaning:7'].seen).toBe(99);
});

test('쓰기에 실패하면 다음 쓰기에서 바뀐 조각을 다시 쓴다', async () => {
  const write = createSaveWriter();
  const save = bigSave(100);
  (AsyncStorage.multiSet as jest.Mock).mockRejectedValueOnce(new Error('disk'));
  await expect(write(save)).rejects.toThrow('disk');
  await write(save);
  const loaded = await loadSaveResult();
  expect(loaded.kind === 'loaded' && loaded.save.progress.stats).toEqual(save.progress.stats);
});

test('조각이 없거나 깨지면 손상으로 보고, 원문 전체를 보관한 뒤 모두 비운다', async () => {
  await writeSave(bigSave(100));
  await AsyncStorage.removeItem(partKey(3));
  await AsyncStorage.setItem(partKey(5), '{broken');
  const loaded = await loadSaveResult();
  expect(loaded.kind).toBe('invalid');
  if (loaded.kind !== 'invalid') return;
  const raw = JSON.parse(loaded.raw);
  expect(JSON.parse(raw.main).totalGrains).toBe(0);
  expect(raw.parts[5]).toBe('{broken');
  await backupBrokenSave(loaded.raw, 1);
  const keys = await AsyncStorage.getAllKeys();
  expect(keys).toEqual([`${SAVE_KEY}.broken.1`]);
  expect((await loadSaveResult()).kind).toBe('missing');
});

test('조각을 읽다 기기 오류가 나면 io-error', async () => {
  await writeSave(bigSave(10));
  (AsyncStorage.multiGet as jest.Mock).mockRejectedValueOnce(new Error('disk'));
  expect((await loadSaveResult()).kind).toBe('io-error');
});

test('깨진 저장 보관본은 최근 두 개만 남긴다', async () => {
  for (const at of [1, 2, 3]) {
    await AsyncStorage.setItem(SAVE_KEY, '{broken');
    await backupBrokenSave('{broken', at);
  }
  expect([...(await AsyncStorage.getAllKeys())].sort()).toEqual([`${SAVE_KEY}.broken.2`, `${SAVE_KEY}.broken.3`]);
});
