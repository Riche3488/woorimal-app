import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { PlayScreen } from '../PlayScreen';
import { createSession, policyFor, type SessionSnapshot } from '../../core/session';
import type { AppQuestion } from '../../core/types';
jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(async () => {}),
  NotificationFeedbackType: {
    Success: 's',
    Error: 'e'
  }
}));
const q: AppQuestion = {
  key: 'spelling:1',
  type: 'spelling',
  kind: 'choice',
  prompt: '문제',
  answer: '가',
  choices: ['가', '나'],
  explain: '설명',
  source: 'original',
  easy: true
};
const initial = () => createSession([q, {
  ...q,
  key: 'spelling:2',
  prompt: '다음 문제'
}], {
  mode: 'normal',
  day: '2026-11-22',
  packVersion: 'p',
  rulesVersion: '1'
}, Date.now(), 's', policyFor('normal'));
test('last_feedback_survives_restart_with_frozen_choices', async () => {
  let saved = initial();
  const checkpoint = async (s: SessionSnapshot) => {
    saved = JSON.parse(JSON.stringify(s));
  };
  const view = await render(<PlayScreen questions={saved.round.questions} initialSession={saved} onCheckpoint={checkpoint} onFinish={jest.fn()} />);
  await fireEvent.press(screen.getByText('나'));
  expect(saved.round.results).toHaveLength(1);
  await view.unmount();
  await render(<PlayScreen questions={saved.round.questions} initialSession={{
    ...saved,
    paused: true
  }} onCheckpoint={checkpoint} onFinish={jest.fn()} />);
  await fireEvent.press(screen.getByText('이어서 풀기'));
  expect(screen.getByText('아쉬워요')).toBeTruthy();
  expect(screen.getByText('정답: 가')).toBeTruthy();
  expect(saved.round.questions[0].choices).toEqual(['가', '나']);
});
test('failed_submit_save_blocks_next_and_retry_saves_same_result_once', async () => {
  let fail = true;
  let saved = initial();
  const checkpoint = async (s: SessionSnapshot) => {
    if (fail) throw new Error('disk');
    saved = s;
  };
  await render(<PlayScreen questions={saved.round.questions} initialSession={saved} onCheckpoint={checkpoint} onFinish={jest.fn()} />);
  await fireEvent.press(screen.getByText('가'));
  expect(screen.getByText('저장하지 못했어요')).toBeTruthy();
  await fireEvent.press(screen.getByText('다음 문제'));
  expect(screen.getByText('정답!')).toBeTruthy();
  expect(saved.round.results).toHaveLength(0);
  fail = false;
  await fireEvent.press(screen.getByText('다시 저장'));
  expect(saved.round.results).toHaveLength(1);
  await fireEvent.press(screen.getByText('다음 문제'));
  expect(screen.getByText('다음 문제', {
    exact: true
  })).toBeTruthy();
});
