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
const reviewSession = (question: AppQuestion) => createSession([question], {
  mode: 'review',
  day: '2026-11-22',
  packVersion: 'p',
  rulesVersion: '1'
}, Date.now(), 'retry-input', policyFor('review'));
test('typed_review_retry_accepts_a_corrected_draft_without_replacing_first_result', async () => {
  const question: AppQuestion = {
    key: 'meaning:retry',
    type: 'meaning',
    kind: 'typed',
    prompt: '고쳐 입력하기',
    answer: '가',
    explain: '규칙',
    source: 'original',
    easy: true
  };
  const finish = jest.fn();
  await render(<PlayScreen initialSession={reviewSession(question)} questions={[question]} onFinish={finish} />);
  await fireEvent.changeText(screen.getByLabelText('답 입력'), '나');
  await fireEvent.press(screen.getByText('확인'));
  expect(screen.getByText('아쉬워요. 한 번 더 생각해 볼까요?')).toBeTruthy();
  await fireEvent.changeText(screen.getByLabelText('답 입력'), '가');
  expect(screen.getByLabelText('답 입력').props.value).toBe('가');
  await fireEvent.press(screen.getByText('확인'));
  expect(screen.getByText(/도움받아 해결했어요/)).toBeTruthy();
  await fireEvent.press(screen.getByText('다음 문제'));
  expect(finish.mock.calls[0][0].results).toEqual([expect.objectContaining({
    correct: false,
    userAnswer: '나'
  })]);
});
test('spacing_review_retry_accepts_changed_gaps_without_replacing_first_result', async () => {
  const question: AppQuestion = {
    key: 'spacing:retry',
    type: 'spacing',
    kind: 'spacing',
    prompt: '고쳐 띄어쓰기',
    answer: '가 나',
    answers: ['가 나'],
    syllables: ['가', '나'],
    explain: '규칙',
    source: 'original',
    easy: true
  };
  const finish = jest.fn();
  await render(<PlayScreen initialSession={reviewSession(question)} questions={[question]} onFinish={finish} />);
  await fireEvent.press(screen.getByText('확인'));
  expect(screen.getByText('아쉬워요. 한 번 더 생각해 볼까요?')).toBeTruthy();
  await fireEvent.press(screen.getByLabelText('1번째 글자 뒤 띄우기'));
  expect(screen.getByLabelText('1번째 글자 뒤 띄우기')).toBeSelected();
  await fireEvent.press(screen.getByText('확인'));
  expect(screen.getByText(/도움받아 해결했어요/)).toBeTruthy();
  await fireEvent.press(screen.getByText('다음 문제'));
  expect(finish.mock.calls[0][0].results).toEqual([expect.objectContaining({
    correct: false,
    userAnswer: '가나'
  })]);
});
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
