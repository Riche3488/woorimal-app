import { render, screen } from '@testing-library/react-native';
import Result from '../../app/result';
import { createSession, policyFor, reduceSession } from '../../core/session';
import { checkpointSession, commitSession } from '../../core/session-commit';
import { defaultSave } from '../../data/save';
import type { Game } from '../../state/GameProvider';
import type { AppQuestion } from '../../core/types';
let mockGame: Game;
jest.mock('../../state/GameProvider', () => ({
  useGame: () => mockGame
}));
jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    canDismiss: () => false
  }
}));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({
    children
  }: {
    children: unknown;
  }) => children
}));
jest.mock('../art', () => {
  const React = require('react');
  const {
    View
  } = require('react-native');
  return {
    Pop: ({
      children
    }: any) => children,
    PressableScale: View,
    LevelUpScene: View
  };
});
test('later_card_earnings_do_not_change_a_completed_quiz_growth_receipt', async () => {
  const question: AppQuestion = {
    key: 'meaning:1',
    type: 'meaning',
    kind: 'typed',
    prompt: '뜻',
    answer: '가',
    explain: '',
    source: 'original',
    easy: true
  };
  const at = new Date(2026, 10, 22, 12).getTime();
  const session = createSession([question], {
    mode: 'quick',
    day: '2026-11-22',
    packVersion: 'p',
    rulesVersion: '1'
  }, at, 'receipt', policyFor('quick', {
    rewardPolicy: 'learning-v2'
  }));
  const before = {
    ...defaultSave(),
    totalGrains: 10,
    activeSession: session
  };
  let saved = checkpointSession(before, reduceSession(session, {
    kind: 'answer',
    input: '가',
    answeredAt: at
  }));
  saved = checkpointSession(saved, reduceSession(saved.activeSession!, {
    kind: 'next'
  }));
  saved = commitSession(saved, session.id, at);
  expect(saved.lastOutcome?.afterGrains).toBe(25);
  mockGame = {
    save: {
      ...saved,
      totalGrains: 60
    },
    previousSave: before,
    lastRound: saved.lastOutcome!.session.round,
    lastMode: 'quick',
    lastPracticeType: null,
    today: '2026-11-22',
    counts: {
      due: 0,
      review: 0,
      mastered: 0,
      starred: 0
    },
    pack: {
      schema: 1,
      version: 'p',
      generatedAt: '',
      counts: {},
      questions: [question]
    },
    toggleStar: jest.fn()
  } as unknown as Game;
  await render(<Result />);
  expect(screen.queryByText(/레벨 업!/)).toBeNull();
  expect(screen.getByText('Lv.1 · 다음 레벨까지 낱알 25개')).toBeTruthy();
});
