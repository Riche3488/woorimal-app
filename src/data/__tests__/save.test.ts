import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadSave, writeSave, finishRound, defaultSave, toggleStarSave, SAVE_KEY } from '../save';
import { startRound, answer } from '../../core/round';
import type { AppQuestion } from '../../core/types';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

const q = (n: number): AppQuestion => ({
  key: `meaning:${n}`, type: 'meaning', kind: 'typed', prompt: '뜻', answer: `답${n}`, explain: '', source: 'original', easy: true,
});

beforeEach(() => AsyncStorage.clear());

test('저장이 없으면 기본값', async () => {
  await expect(loadSave()).resolves.toEqual(defaultSave());
  expect(defaultSave()).toMatchObject({ schema: 1, totalGrains: 0, rounds: 0, streak: { days: 0, lastDay: null, freezes: 0 }, settings: { haptics: true, sound: true } });
});

test('깨진 저장은 기본값(예외 없음)', async () => {
  await AsyncStorage.setItem(SAVE_KEY, '{broken');
  await expect(loadSave()).resolves.toEqual(defaultSave());
  await AsyncStorage.setItem(SAVE_KEY, JSON.stringify({ schema: 99 }));
  await expect(loadSave()).resolves.toEqual(defaultSave());
});

test('finishRound가 낱알·판 수·연속 기록·문제 기록을 갱신하고 저장 왕복이 같다', async () => {
  const T0 = new Date(2026, 10, 19, 8, 0).getTime();
  let round = startRound([q(1), q(2)], T0);
  round = answer(round, '답1', T0);
  round = answer(round, '틀림', T0 + 1000);
  const next = finishRound(defaultSave(), round, new Date(T0 + 2000));
  expect(next.totalGrains).toBe(20);
  expect(next.rounds).toBe(1);
  expect(next.streak).toEqual({ days: 1, lastDay: '2026-11-19', freezes: 0 });
  expect(next.progress.stats['meaning:2'].needsReview).toBe(true);
  await writeSave(next);
  await expect(loadSave()).resolves.toEqual(next);
});

test('테스트 모드는 기본으로 꺼져 있고, 예전 저장을 읽어도 꺼져 있다', async () => {
  expect(defaultSave().settings.testMode).toBe(false);
  const old = { ...defaultSave(), settings: { haptics: false, sound: true } };
  await AsyncStorage.setItem(SAVE_KEY, JSON.stringify(old));
  const loaded = await loadSave();
  expect(loaded.settings).toEqual({ haptics: false, sound: true, testMode: false, choiceMode: false });
});

test('finishRound가 오늘 판 수를 세고, 예전 저장에는 하루 목표·도토리 기본값을 채운다', async () => {
  const T0 = new Date(2026, 10, 19, 8, 0).getTime();
  const round = answer(startRound([q(1)], T0), '답1', T0);
  const once = finishRound(defaultSave(), round, new Date(T0));
  expect(once.daily).toEqual({ day: '2026-11-19', rounds: 1 });
  expect(finishRound(once, round, new Date(T0 + 1000)).daily.rounds).toBe(2);

  const old = { schema: 1, totalGrains: 10, rounds: 1, streak: { days: 2, lastDay: '2026-11-18' }, progress: { stats: {}, triesByType: {} }, settings: {} };
  await AsyncStorage.setItem(SAVE_KEY, JSON.stringify(old));
  const loaded = await loadSave();
  expect(loaded.daily).toEqual({ day: null, rounds: 0 });
  expect(loaded.streak).toEqual({ days: 2, lastDay: '2026-11-18', freezes: 0 });
});

test('오늘의 문제를 끝내면 그날 칸 기록을 남기고, 일반 판은 건드리지 않는다', async () => {
  const T0 = new Date(2026, 10, 19, 8, 0).getTime();
  let round = startRound([q(1), q(2)], T0, 5);
  round = answer(round, '답1', T0);
  round = answer(round, '틀림', T0 + 1000);
  const after = finishRound(defaultSave(), round, new Date(T0), 'challenge');
  expect(after.challenge).toEqual({ day: '2026-11-19', marks: 'ox' });
  expect(after.totalGrains).toBe(20);
  expect(finishRound(after, round, new Date(T0 + 5000)).challenge).toEqual(after.challenge);
  expect(defaultSave().challenge).toEqual({ day: null, marks: '' });
});

test('예전 저장(needsReview만)은 읽을 때 노트 형식으로 채운다', async () => {
  const D0 = new Date(2026, 10, 19, 9).getTime();
  const old = { ...defaultSave(), progress: { triesByType: { meaning: 1 }, stats: { 'meaning:1': { seen: 1, correct: 0, lastAt: D0, lastWrongAt: D0, needsReview: true } } } };
  await AsyncStorage.setItem(SAVE_KEY, JSON.stringify(old));
  const loaded = await loadSave();
  expect(loaded.progress.stats['meaning:1']).toMatchObject({ box: 1, dueDay: '2026-11-20', wrong: 1, needsReview: true });
});

test('⭐는 판 결과 저장 뒤에도 남는다', () => {
  const T0 = new Date(2026, 10, 19, 8, 0).getTime();
  const round = answer(startRound([q(2)], T0), '틀림', T0 + 1000);
  const next = finishRound(toggleStarSave(defaultSave(), 'meaning:2'), round, new Date(T0 + 2000));
  expect(next.progress.stats['meaning:2']).toMatchObject({ starred: true, box: 1 });
});

test('깨진 문제 기록 하나 때문에 저장 전체를 잃지 않는다', async () => {
  const D0 = new Date(2026, 10, 19, 9).getTime();
  const data = { ...defaultSave(), totalGrains: 500, progress: { triesByType: {}, stats: {
    'meaning:1': null, 'meaning:2': 'oops', 'meaning:3': { needsReview: true, lastAt: D0 },
    'meaning:4': { seen: 1, correct: 0, lastAt: D0, lastWrongAt: D0, needsReview: true },
  } } };
  await AsyncStorage.setItem(SAVE_KEY, JSON.stringify(data));
  const loaded = await loadSave();
  expect(loaded.totalGrains).toBe(500);
  expect(Object.keys(loaded.progress.stats).sort()).toEqual(['meaning:3', 'meaning:4']);
  expect(loaded.progress.stats['meaning:3']).toMatchObject({ seen: 0, correct: 0, box: 1, wrong: 1 });
  expect(loaded.progress.stats['meaning:4']).toMatchObject({ box: 1, wrong: 1 });
});
