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
  await fireEvent.press(screen.getByText('다음 문제'));
  expect(screen.getByText('맞춤법은?')).toBeTruthy();
  expect(screen.queryByText('출처: KBS 우리말 겨루기')).toBeNull();
});

test('오답 3번이면 판이 끝난다', async () => {
  const onFinish = jest.fn();
  const qs = [originalChoice, { ...originalChoice, key: 'spelling:4' }, { ...originalChoice, key: 'spelling:5' }, { ...originalChoice, key: 'spelling:6' }];
  await render(<PlayScreen questions={qs} onFinish={onFinish} />);
  for (let i = 0; i < 3; i++) {
    await fireEvent.press(screen.getByText('오똑이'));
    await fireEvent.press(screen.getByText('다음 문제'));
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


test('틀리면 자동으로 넘기지 않고, 해설을 끝까지 보여 준 뒤 눌러야 넘어간다', async () => {
  const longExplain = '해설 '.repeat(200);
  await render(<PlayScreen questions={[{ ...originalChoice, explain: longExplain }, kbsChoice]} onFinish={jest.fn()} />);
  await fireEvent.press(screen.getByText('오똑이'));
  await advance(10_000);
  expect(screen.getByText('아쉬워요')).toBeTruthy();
  await fireEvent.press(screen.getByText('해설 더 보기'));
  expect(screen.getByText(longExplain).props.numberOfLines).toBeUndefined();
  await fireEvent.press(screen.getByText('다음 문제'));
  expect(screen.getByText('바른 말은?')).toBeTruthy();
});

test('자동 진행을 켜면 정답은 3초 뒤 넘어간다', async () => {
  await render(<PlayScreen questions={[originalChoice, kbsChoice]} onFinish={jest.fn()} autoAdvanceCorrect />);
  await fireEvent.press(screen.getByText('오뚝이'));
  await advance(3100);
  expect(screen.getByText('바른 말은?')).toBeTruthy();
});

test('오늘의 문제: 하트를 숨기고 세 번 틀려도 끝까지 푼다', async () => {
  const onFinish = jest.fn();
  const qs = [1, 2, 3, 4, 5].map(n => ({ ...originalChoice, key: `spelling:${n}` }));
  await render(<PlayScreen questions={qs} onFinish={onFinish} hearts={5} showHearts={false} />);
  expect(screen.queryAllByLabelText('남은 하트')).toHaveLength(0);
  for (let i = 0; i < 4; i++) {
    await fireEvent.press(screen.getByText('오똑이'));
    await fireEvent.press(screen.getByText('다음 문제'));
  }
  expect(onFinish).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByText('오뚝이'));
  await fireEvent.press(screen.getByText('다음 문제'));
  expect(onFinish).toHaveBeenCalledTimes(1);
  expect(onFinish.mock.calls[0][0].results).toHaveLength(5);
});

describe('모르겠어요', () => {
  test('누르면 하트가 줄고 정답과 모르겠어요가 보인다', async () => {
    await render(<PlayScreen questions={[originalChoice, kbsChoice]} onFinish={jest.fn()} />);
    await fireEvent.press(screen.getByText('모르겠어요'));
    expect(screen.getAllByLabelText('남은 하트')).toHaveLength(2);
    expect(screen.getByText('정답: 오뚝이')).toBeTruthy();
    expect(screen.getByText('다음 문제')).toBeTruthy();
    expect(screen.getByText('모르겠어요')).toBeTruthy(); // 판정 문구
  });
  test('두 번 눌러도 결과는 하나', async () => {
    const onFinish = jest.fn();
    await render(<PlayScreen questions={[originalChoice]} onFinish={onFinish} />);
    const btn = screen.getByText('모르겠어요');
    await fireEvent.press(btn);
    await fireEvent.press(btn);
    await fireEvent.press(screen.getByText('다음 문제'));
    expect(onFinish).toHaveBeenCalledTimes(1);
    const round = onFinish.mock.calls[0][0];
    expect(round.results).toHaveLength(1);
    expect(round.results[0]).toMatchObject({ gaveUp: true, correct: false });
    expect(round.hearts).toBe(2);
  });
  test('입력형에도 있다', async () => {
    await render(<PlayScreen questions={[typedQ]} onFinish={jest.fn()} />);
    expect(screen.getByText('모르겠어요')).toBeTruthy();
  });
});

describe('⭐ 담기', () => {
  test('별을 누르면 onToggleStar(key)가 불리고 다음 문제로 넘어가지 않는다', async () => {
    const onToggleStar = jest.fn();
    await render(<PlayScreen questions={[originalChoice, kbsChoice]} onFinish={jest.fn()} starred={() => false} onToggleStar={onToggleStar} />);
    expect(screen.queryByLabelText('담기')).toBeNull(); // 문제 푸는 중에는 없음
    await fireEvent.press(screen.getByText('오똑이'));
    await fireEvent.press(screen.getByLabelText('담기'));
    expect(onToggleStar).toHaveBeenCalledWith('spelling:2');
    expect(screen.getByText('다음 문제')).toBeTruthy();
  });
  test('담긴 문제는 담기 취소로 보인다', async () => {
    await render(<PlayScreen questions={[originalChoice]} onFinish={jest.fn()} starred={() => true} onToggleStar={jest.fn()} />);
    await fireEvent.press(screen.getByText('오똑이'));
    expect(screen.getByLabelText('담기 취소')).toBeTruthy();
  });
  test('onToggleStar가 없으면 별이 없다', async () => {
    await render(<PlayScreen questions={[originalChoice]} onFinish={jest.fn()} />);
    await fireEvent.press(screen.getByText('오똑이'));
    expect(screen.queryByLabelText('담기')).toBeNull();
  });
});

test('해설 화면의 "문제가 이상해요"는 그 문제로 신고를 부르고, 판은 넘어가지 않는다', async () => {
  const onReport = jest.fn();
  await render(<PlayScreen questions={[originalChoice, kbsChoice]} onFinish={jest.fn()} onReport={onReport} />);
  expect(screen.queryByText('문제가 이상해요')).toBeNull();
  await fireEvent.press(screen.getByText('오똑이'));
  await fireEvent.press(screen.getByText('문제가 이상해요'));
  expect(onReport).toHaveBeenCalledWith(expect.objectContaining({ key: 'spelling:2' }));
  expect(screen.getByText('맞춤법은?')).toBeTruthy();
});

test('신고 기능을 넘기지 않으면 신고 버튼이 없다', async () => {
  await render(<PlayScreen questions={[originalChoice, kbsChoice]} onFinish={jest.fn()} />);
  await fireEvent.press(screen.getByText('오똑이'));
  expect(screen.queryByText('문제가 이상해요')).toBeNull();
});
