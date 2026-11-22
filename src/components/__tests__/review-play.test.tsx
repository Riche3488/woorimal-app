import { fireEvent, render, screen } from '@testing-library/react-native';
import { PlayScreen } from '../PlayScreen';
import { createSession, policyFor } from '../../core/session';
import type { AppQuestion } from '../../core/types';
jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(async () => {}),
  NotificationFeedbackType: {
    Success: 's',
    Error: 'e'
  }
}));
test('three_wrong_answers_do_not_end_review_and_assisted_correct_keeps_first_wrong', async () => {
  const qs: AppQuestion[] = Array.from({
    length: 4
  }, (_, i) => ({
    key: `spelling:${i}`,
    kind: 'choice',
    type: 'spelling',
    prompt: `문제${i}`,
    answer: '가',
    choices: ['가', '나'],
    explain: '규칙',
    source: 'original',
    easy: true
  }));
  const session = createSession(qs, {
    mode: 'review',
    day: '2026-11-22',
    packVersion: 'p',
    rulesVersion: '1'
  }, Date.now(), 's', policyFor('review'));
  const finish = jest.fn();
  await render(<PlayScreen initialSession={session} questions={qs} onFinish={finish} />);
  for (let i = 0; i < 3; i++) {
    await fireEvent.press(screen.getByText('나'));
    await fireEvent.press(screen.getByText('정답 보기'));
    await fireEvent.press(screen.getByText('다음 문제'));
  }
  expect(screen.getByText('문제3')).toBeTruthy();
  expect(screen.queryAllByLabelText('남은 하트')).toHaveLength(0);
  await fireEvent.press(screen.getByText('나'));
  await fireEvent.press(screen.getByText('가'));
  expect(screen.getByText(/도움받아 해결했어요/)).toBeTruthy();
  await fireEvent.press(screen.getByText('다음 문제'));
  expect(finish.mock.calls[0][0].results.map((r: {
    correct: boolean;
  }) => r.correct)).toEqual([false, false, false, false]);
});
