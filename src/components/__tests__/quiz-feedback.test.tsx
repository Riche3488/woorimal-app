import { fireEvent, render, screen } from '@testing-library/react-native';
import { QuizFeedback } from '../QuizFeedback';
import type { AppQuestion } from '../../core/types';
const question: AppQuestion = {
  key: 'a',
  type: 'meaning',
  kind: 'typed',
  prompt: '뜻',
  answer: '가',
  explain: '긴 해설',
  source: 'original',
  easy: true
};
const result = {
  key: 'a',
  type: 'meaning',
  correct: true,
  timedOut: false,
  gaveUp: false,
  synonymHit: false,
  userAnswer: '가',
  elapsedMs: 0,
  grains: 20
};
test('feedback_controls_do_not_trigger_next_and_expand_cancels_auto', async () => {
  const next = jest.fn(),
    expand = jest.fn(),
    star = jest.fn(),
    report = jest.fn();
  await render(<QuizFeedback question={question} result={result} onNext={next} onExpand={expand} onToggleStar={star} onReport={report} />);
  await fireEvent.press(screen.getByText('해설 더 보기'));
  await fireEvent.press(screen.getByLabelText('담기'));
  await fireEvent.press(screen.getByText('문제가 이상해요'));
  expect(expand).toHaveBeenCalledTimes(1);
  expect(star).toHaveBeenCalledTimes(1);
  expect(report).toHaveBeenCalledTimes(1);
  expect(next).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByText('다음 문제'));
  expect(next).toHaveBeenCalledTimes(1);
});
