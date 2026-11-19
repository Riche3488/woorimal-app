import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadSave, writeSave, finishRound, defaultSave, SAVE_KEY } from '../save';
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
  expect(loaded.settings).toEqual({ haptics: false, sound: true, testMode: false });
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
