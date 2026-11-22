import { creditReward, rewardForActivity } from '../rewards';
import { defaultSave } from '../../data/save';
import type { LearningActivity } from '../activity';
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
const a: LearningActivity = {
  id: 'a',
  contentId: 'q:a',
  source: 'card',
  occurredAt: new Date(2026, 10, 22).getTime(),
  correct: true,
  assisted: false,
  usedHint: false,
  timedOut: false,
  gaveUp: false,
  autoFilled: false,
  firstSeen: true,
  dueBeforeAnswer: false
};
test('fresh_and_due_correct_are_15_and_crossword_hint_is_3', () => {
  expect(rewardForActivity(a, 'learning-v2')).toBe(15);
  expect(rewardForActivity({
    ...a,
    firstSeen: false,
    dueBeforeAnswer: true
  }, 'learning-v2')).toBe(15);
  expect(rewardForActivity({
    ...a,
    source: 'crossword',
    usedHint: true
  }, 'learning-v2')).toBe(3);
});
test('same_day_repeat_reward_is_zero_across_card_and_quiz', () => {
  const first = creditReward(defaultSave(), a, 'learning-v2');
  expect(first.totalGrains).toBe(15);
  expect(creditReward(first, {
    ...a,
    id: 'other',
    source: 'quiz'
  }, 'learning-v2').totalGrains).toBe(15);
});
test('quiz_reward_is_reserved_until_completion_and_assisted_answer_earns_nothing', () => {
  const next = creditReward(defaultSave(), {
    ...a,
    source: 'quiz',
    sessionId: 's'
  }, 'learning-v2');
  expect(next.totalGrains).toBe(0);
  expect(next.rewardLedger['2026-11-22']['q:a']).toMatchObject({
    grains: 15,
    paid: false,
    sessionId: 's'
  });
  expect(rewardForActivity({
    ...a,
    assisted: true
  }, 'learning-v2')).toBe(0);
});
