import { applyActivity, dailyProgress, type LearningActivity } from '../activity';
import { defaultSave } from '../../data/save';
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
const at = new Date(2026, 10, 22, 12).getTime();
export const activity = (id: string, extra: Partial<LearningActivity> = {}): LearningActivity => ({
  id,
  contentId: `q:${id}`,
  source: 'card',
  occurredAt: at,
  correct: true,
  assisted: false,
  usedHint: false,
  timedOut: false,
  gaveUp: false,
  autoFilled: false,
  firstSeen: true,
  dueBeforeAnswer: false,
  ...extra
});
test('card_and_puzzle_only_can_complete_five_and_milestones_are_1_3_5', () => {
  let s = defaultSave();
  for (let i = 0; i < 5; i++) {
    s = applyActivity(s, activity(String(i), {
      source: i ? 'crossword' : 'card'
    }));
    expect(dailyProgress(s.activity, '2026-11-22').milestones).toBe([1, 1, 2, 2, 3][i]);
  }
  expect(dailyProgress(s.activity, '2026-11-22').complete).toBe(true);
  expect(s.streak.days).toBe(1);
});
test('same_question_across_modes_counts_once_but_wrong_independent_answer_counts', () => {
  let s = applyActivity(defaultSave(), activity('a', {
    correct: false
  }));
  s = applyActivity(s, activity('a2', {
    source: 'quiz',
    contentId: 'q:a'
  }));
  expect(dailyProgress(s.activity, '2026-11-22').learned).toBe(1);
  for (const extra of [{
    assisted: true
  }, {
    timedOut: true
  }, {
    gaveUp: true
  }, {
    autoFilled: true
  }]) s = applyActivity(s, activity(JSON.stringify(extra), extra));
  expect(dailyProgress(s.activity, '2026-11-22').learned).toBe(1);
});
test('activity_cross_midnight_uses_answer_day_and_always_correct_word_is_discovered', () => {
  let s = applyActivity(defaultSave(), activity('a', {
    word: '가늘다'
  }));
  s = applyActivity(s, activity('b', {
    occurredAt: new Date(2026, 10, 23, 0, 1).getTime()
  }));
  expect(dailyProgress(s.activity, '2026-11-22').learned).toBe(1);
  expect(dailyProgress(s.activity, '2026-11-23').learned).toBe(1);
  expect(s.discoveries['가늘다'].word).toBe('가늘다');
});
