import { pickAdaptiveRound } from '../adaptive-picker';
import { emptyProgress, recordRecentAttempt, type Progress } from '../progress';
import { seededRng } from '../challenge';
import type { AppQuestion } from '../types';
const bank: AppQuestion[] = Array.from({
  length: 30
}, (_, i) => ({
  key: `spelling:${i}`,
  type: 'spelling',
  kind: 'choice',
  prompt: `문제${i}`,
  answer: `답${i}`,
  choices: [`답${i}`, '다른 답'],
  explain: '규칙',
  source: 'original',
  easy: i < 10,
  ...(i >= 20 ? {
    level: 'hard' as const
  } : {})
}));
const options = (count = 10) => ({
  now: new Date(2026, 10, 22, 12).getTime(),
  rng: seededRng('adaptive'),
  count,
  choiceMode: false
});
const experienced = (): Progress => ({
  ...emptyProgress(),
  recentAttempts: {
    'spelling:choice': Array.from({
      length: 20
    }, (_, i) => ({
      key: `old:${i}`,
      correct: true,
      elapsedMs: 1000,
      answeredAt: 1
    }))
  }
});
test('normal_10_targets_3_easy_5_matched_2_challenge_and_quick_5_targets_2_2_1', () => {
  for (const [count, expected] of [[10, [3, 5, 2]], [5, [2, 2, 1]]] as const) {
    const qs = pickAdaptiveRound(bank, experienced(), options(count));
    expect([qs.filter(q => q.easy).length, qs.filter(q => !q.easy && q.level !== 'hard').length, qs.filter(q => q.level === 'hard').length]).toEqual(expected);
  }
});
test('insufficient_history_uses_easy_first_and_choice_history_does_not_raise_typed_difficulty', () => {
  expect(pickAdaptiveRound(bank, emptyProgress(), options()).every(q => q.easy)).toBe(true);
  const typed = bank.map(q => ({
    ...q,
    type: 'meaning' as const,
    kind: 'typed' as const,
    choices: undefined
  }));
  const progress = {
    ...experienced(),
    recentAttempts: {
      'meaning:choice': experienced().recentAttempts!['spelling:choice']
    }
  };
  expect(pickAdaptiveRound(typed, progress, options()).every(q => q.easy)).toBe(true);
});
test('low_accuracy_removes_challenges_and_sparse_pool_never_duplicates_answers', () => {
  const p = experienced();
  p.recentAttempts!['spelling:choice'] = p.recentAttempts!['spelling:choice'].map(a => ({
    ...a,
    correct: false
  }));
  expect(pickAdaptiveRound(bank, p, options()).some(q => q.level === 'hard')).toBe(false);
  const qs = pickAdaptiveRound(bank.slice(0, 3), p, options());
  expect(qs).toHaveLength(3);
  expect(new Set(qs.map(q => q.answer)).size).toBe(3);
});
test('assisted_or_timeout_attempt_is_excluded_and_actual_foreground_time_is_preserved', () => {
  const result = {
    key: bank[0].key,
    type: 'spelling',
    correct: true,
    timedOut: false,
    gaveUp: false,
    synonymHit: false,
    userAnswer: '답0',
    elapsedMs: 3000,
    grains: 0,
    answeredAt: 999999
  };
  const p = emptyProgress();
  expect(recordRecentAttempt(p, bank[0], result, true)).toBe(p);
  expect(recordRecentAttempt(p, bank[0], {
    ...result,
    timedOut: true
  })).toBe(p);
  expect(recordRecentAttempt(p, bank[0], result).recentAttempts!['spelling:choice'][0].elapsedMs).toBe(3000);
});
test('due_review_caps_hold_for_both_experienced_and_cold_quick_rounds', () => {
  const p = experienced();
  for (const q of bank.slice(0, 10)) p.stats[q.key] = {
    seen: 1,
    correct: 0,
    lastAt: 1,
    needsReview: true,
    box: 1,
    dueDay: '2026-11-22',
    wrong: 1
  };
  expect(pickAdaptiveRound(bank, p, options(10)).filter(q => p.stats[q.key]?.needsReview)).toHaveLength(2);
  expect(pickAdaptiveRound(bank, {
    ...p,
    recentAttempts: {}
  }, options(5)).filter(q => p.stats[q.key]?.needsReview)).toHaveLength(1);
});
