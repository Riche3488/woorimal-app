import { act, fireEvent, render, screen } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Text } from 'react-native';
import { GameProvider, useGame, type Game } from '../GameProvider';
import { reduceSession } from '../../core/session';
import type { AppPack } from '../../core/types';
import type { RoundResult } from '../../core/round';
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('../../data/pack-store', () => ({
  loadPack: jest.fn(async () => ({
    schema: 1,
    version: 'p',
    generatedAt: '2026-11-22',
    counts: {},
    crosswords: [{
      id: 'time-board',
      level: 'easy',
      theme: 'time',
      rows: 4,
      cols: 4,
      intro: '',
      notes: [],
      entries: [{
        num: 1,
        dir: 'across',
        row: 0,
        col: 0,
        answer: '가나다',
        clue: 'time'
      }]
    }],
    questions: [{
      key: 'spelling:1',
      type: 'spelling',
      kind: 'choice',
      prompt: '문제',
      answer: '가',
      choices: ['가', '나'],
      explain: '설명',
      source: 'original',
      easy: true
    }]
  })),
  refreshPack: jest.fn(async () => null)
}));
let game: Game;
function Probe() {
  game = useGame();
  return <Text>결과 {game.lastRound?.results.length ?? 0}</Text>;
}
test('one_retry_preserves_two_failed_star_actions_in_order', async () => {
  await AsyncStorage.clear();
  await render(<GameProvider><Probe /></GameProvider>);
  (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error('disk')).mockRejectedValueOnce(new Error('disk'));
  await act(async () => {
    game.toggleStar('spelling:1');
    game.toggleStar('spelling:2');
  });
  expect(screen.getByText('저장하지 못했어요')).toBeTruthy();
  await fireEvent.press(screen.getByText('다시 시도'));
  expect(game.save.progress.stats['spelling:1']?.starred).toBe(true);
  expect(game.save.progress.stats['spelling:2']?.starred).toBe(true);
  expect(screen.queryByText('저장하지 못했어요')).toBeNull();
});
const cardAnswer: RoundResult = {
  key: 'spelling:1',
  type: 'spelling',
  correct: true,
  timedOut: false,
  gaveUp: false,
  synonymHit: false,
  userAnswer: '가',
  elapsedMs: 0,
  grains: 0
};
test.each(['card', 'puzzle'])('%s_retry_after_midnight_keeps_the_submission_day', async source => {
  jest.useFakeTimers();
  try {
    jest.setSystemTime(new Date(2026, 10, 22, 23, 59));
    await AsyncStorage.clear();
    await render(<GameProvider><Probe /></GameProvider>);
    (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error('disk'));
    await act(async () => {
      if (source === 'card') await Promise.resolve(game.answerCard(cardAnswer)).catch(() => {});else await Promise.resolve(game.updateCrossword('time-board', {
        solved: [0],
        revealed: {},
        helps: 0
      }, 5, {
        entryIndex: 0
      })).catch(() => {});
    });
    jest.setSystemTime(new Date(2026, 10, 23, 0, 1));
    await fireEvent.press(screen.getByText('다시 시도'));
    expect(game.save.activity['2026-11-22']?.contentIds).toHaveLength(1);
    expect(game.save.activity['2026-11-23']).toBeUndefined();
    if (source === 'card') expect(game.save.card.day).toBe('2026-11-22');
  } finally {
    jest.useRealTimers();
  }
});
test('global_retry_of_failed_completion_restores_result_without_recording_twice', async () => {
  await AsyncStorage.clear();
  await render(<GameProvider><Probe /></GameProvider>);
  await act(async () => {
    await game.sessions!.begin('normal');
  });
  let s = game!.save.activeSession!;
  s = reduceSession(s, {
    kind: 'answer',
    input: '가',
    answeredAt: Date.now()
  });
  await act(async () => {
    await game.sessions!.checkpoint(s);
  });
  s = reduceSession(s, {
    kind: 'next'
  });
  await act(async () => {
    await game.sessions!.checkpoint(s);
  });
  (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error('disk'));
  await act(async () => {
    await expect(game.sessions!.finish(s.id)).rejects.toThrow('disk');
  });
  expect(screen.getByText('저장하지 못했어요')).toBeTruthy();
  await fireEvent.press(screen.getByText('다시 시도'));
  expect(game!.save.activeSession).toBeNull();
  expect(screen.getByText('결과 1')).toBeTruthy();
  expect(game!.save.progress.stats['spelling:1'].seen).toBe(1);
  expect(game!.save.rounds).toBe(1);
});
test('successful_session_retry_clears_the_same_global_save_error', async () => {
  await AsyncStorage.clear();
  await render(<GameProvider><Probe /></GameProvider>);
  await act(async () => {
    await game.sessions!.begin('normal');
  });
  const s = reduceSession(game!.save.activeSession!, {
    kind: 'answer',
    input: '가',
    answeredAt: Date.now()
  });
  (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error('disk'));
  await act(async () => {
    await expect(game.sessions!.checkpoint(s)).rejects.toThrow('disk');
  });
  expect(screen.getByText('저장하지 못했어요')).toBeTruthy();
  await act(async () => {
    await game.sessions!.checkpoint(s);
  });
  expect(screen.queryByText('저장하지 못했어요')).toBeNull();
});
