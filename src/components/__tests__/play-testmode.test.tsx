import { fireEvent, render, screen } from '@testing-library/react-native';
import { PlayScreen } from '../PlayScreen';
import type { AppQuestion } from '../../core/types';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(async () => {}), notificationAsync: jest.fn(async () => {}),
  ImpactFeedbackStyle: { Light: 'light' }, NotificationFeedbackType: { Success: 's', Error: 'e' },
}));

const typedQ: AppQuestion = {
  key: 'meaning:3', type: 'meaning', kind: 'typed', prompt: '품에 껴안다', answer: '포옹', explain: '',
  hint: { chosung: 'ㅍㅇ', syllables: 2 }, source: 'original', easy: true,
};
const qs = [typedQ, { ...typedQ, key: 'meaning:4' }];

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

test('테스트 모드가 꺼져 있으면 정답·테스트 버튼이 없다', async () => {
  await render(<PlayScreen questions={qs} onFinish={jest.fn()} />);
  expect(screen.queryByText('정답 제출')).toBeNull();
});

test('테스트 모드에서는 정답을 보여주고 정답 제출로 맞힌다', async () => {
  await render(<PlayScreen questions={qs} onFinish={jest.fn()} testMode />);
  expect(screen.getByText('테스트 · 정답: 포옹')).toBeTruthy();
  await fireEvent.press(screen.getByText('정답 제출'));
  expect(screen.getByText('정답!')).toBeTruthy();
});

test('테스트 모드의 오답 제출과 시간 초과', async () => {
  await render(<PlayScreen questions={qs} onFinish={jest.fn()} testMode />);
  await fireEvent.press(screen.getByText('오답 제출'));
  expect(screen.getByText('아쉬워요')).toBeTruthy();
  await fireEvent.press(screen.getByText('눌러서 다음 문제'));
  await fireEvent.press(screen.getByText('시간 초과로 넘기기'));
  expect(screen.getByText('시간 초과')).toBeTruthy();
  expect(screen.getByText('정답: 포옹')).toBeTruthy();
});
