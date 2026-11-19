import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { PlayScreen } from '../PlayScreen';
import { timeLimitMs } from '../../core/timing';
import type { AppQuestion } from '../../core/types';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(async () => {}), notificationAsync: jest.fn(async () => {}),
  ImpactFeedbackStyle: { Light: 'light' }, NotificationFeedbackType: { Success: 's', Error: 'e' },
}));

const kbsChoice: AppQuestion = {
  key: 'broadcast:1', type: 'broadcast', kind: 'choice', prompt: '바른 말은?', answer: '설거지', explain: '',
  choices: ['설거지', '설겆이'], source: 'kbs', easy: true,
};
const originalChoice: AppQuestion = {
  key: 'spelling:2', type: 'spelling', kind: 'choice', prompt: '맞춤법은?', answer: '오뚝이', explain: '',
  choices: ['오뚝이', '오똑이'], source: 'original', easy: true,
};
const typedQ: AppQuestion = {
  key: 'meaning:3', type: 'meaning', kind: 'typed', prompt: '품에 껴안다', answer: '포옹', explain: '',
  hint: { chosung: 'ㅍㅇ', syllables: 2 }, source: 'original', easy: true,
};

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

const advance = (ms: number) => act(async () => { jest.advanceTimersByTime(ms); });

test('KBS 문제에만 출처를 작게 표시한다', async () => {
  await render(<PlayScreen questions={[kbsChoice, originalChoice]} onFinish={jest.fn()} />);
  expect(screen.getByText('출처: KBS 우리말 겨루기')).toBeTruthy();
  await fireEvent.press(screen.getByText('설거지'));
  await advance(1300);
  expect(screen.getByText('맞춤법은?')).toBeTruthy();
  expect(screen.queryByText('출처: KBS 우리말 겨루기')).toBeNull();
});

test('오답 3번이면 판이 끝난다', async () => {
  const onFinish = jest.fn();
  const qs = [originalChoice, { ...originalChoice, key: 'spelling:4' }, { ...originalChoice, key: 'spelling:5' }, { ...originalChoice, key: 'spelling:6' }];
  await render(<PlayScreen questions={qs} onFinish={onFinish} />);
  for (let i = 0; i < 3; i++) {
    await fireEvent.press(screen.getByText('오똑이'));
    await advance(1300);
  }
  expect(onFinish).toHaveBeenCalledTimes(1);
  const round = onFinish.mock.calls[0][0];
  expect(round.hearts).toBe(0);
  expect(round.results).toHaveLength(3);
});

test('제한 시간이 지나면 하트가 하나 줄어든다', async () => {
  await render(<PlayScreen questions={[originalChoice, kbsChoice]} onFinish={jest.fn()} />);
  expect(screen.getAllByLabelText('남은 하트')).toHaveLength(3);
  await advance(timeLimitMs(originalChoice) + 200);
  expect(screen.getAllByLabelText('남은 하트')).toHaveLength(2);
  expect(screen.getByText('시간 초과')).toBeTruthy();
});

test('입력형에서 빈 답을 내면 다음 문제로 넘어가지 않는다', async () => {
  await render(<PlayScreen questions={[typedQ, originalChoice]} onFinish={jest.fn()} />);
  expect(screen.getByText('ㅍㅇ')).toBeTruthy();
  await fireEvent(screen.getByLabelText('답 입력'), 'submitEditing');
  await advance(1300);
  expect(screen.getByText('품에 껴안다')).toBeTruthy();
  await fireEvent.changeText(screen.getByLabelText('답 입력'), '포옹');
  await fireEvent(screen.getByLabelText('답 입력'), 'submitEditing');
  expect(screen.getByText('정답!')).toBeTruthy();
});

test('방송 문제는 소제목(무엇을 고르는지)을 함께 보여 준다', async () => {
  await render(<PlayScreen questions={[{ ...kbsChoice, label: '한 단어 찾기(바른 말 고르기)' }, originalChoice]} onFinish={jest.fn()} />);
  expect(screen.getByText('방송 문제 · 한 단어 찾기(바른 말 고르기)')).toBeTruthy();
});
