// 같은 렌더의 답 처리 함수가 두 번 불리는 경우(마감 순간의 탭+시간 초과, 아주 빠른 두 번 탭)를 재현한다.
// 화면으로는 두 번째 탭 전에 다시 그려지므로, 보기 컴포넌트를 바꿔 끼워 onPick을 직접 두 번 부른다.
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { PlayScreen } from '../PlayScreen';
import type { AppQuestion } from '../../core/types';

jest.mock('expo-haptics', () => ({ notificationAsync: jest.fn(async () => {}), NotificationFeedbackType: { Success: 's', Error: 'e' } }));

let pick: ((c: string) => void) | null = null;
jest.mock('../answers', () => {
  const { Text } = require('react-native');
  return {
    ChoiceAnswer: ({ onPick, choices }: { onPick(c: string): void; choices: string[] }) => { pick = onPick; return <Text>{choices.join('|')}</Text>; },
    TypedAnswer: () => null,
    SpacingAnswer: () => null,
  };
});

const q = (key: string): AppQuestion => ({
  key, type: 'spelling', kind: 'choice', prompt: '맞춤법은?', answer: '오뚝이', explain: '', choices: ['오뚝이', '오똑이'], source: 'original', easy: true,
});

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());
const advance = (ms: number) => act(async () => { jest.advanceTimersByTime(ms); });

test('같은 문제에 답이 두 번 들어와도 한 번만 처리하고, 남은 해설 타이머가 다음 문제를 되돌리지 않는다', async () => {
  const onFinish = jest.fn();
  await render(<PlayScreen questions={[q('a'), q('b'), q('c')]} onFinish={onFinish} />);
  const stalePick = pick!;
  await act(async () => { stalePick('오똑이'); stalePick('오똑이'); });
  expect(screen.getAllByLabelText('남은 하트')).toHaveLength(2);
  await fireEvent.press(screen.getByText('눌러서 다음 문제'));
  await advance(500);
  await act(async () => { pick!('오뚝이'); });
  expect(screen.getByText('정답!')).toBeTruthy();
  await advance(800);
  expect(screen.getByText('정답!')).toBeTruthy();
});
