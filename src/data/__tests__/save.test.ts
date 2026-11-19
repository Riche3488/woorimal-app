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
  expect(defaultSave()).toMatchObject({ schema: 1, totalGrains: 0, rounds: 0, streak: { days: 0, lastDay: null }, settings: { haptics: true, sound: true } });
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
  expect(next.streak).toEqual({ days: 1, lastDay: '2026-11-19' });
  expect(next.progress.stats['meaning:2'].needsReview).toBe(true);
  await writeSave(next);
  await expect(loadSave()).resolves.toEqual(next);
});
