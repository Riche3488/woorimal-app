import { pickQuickRound } from '../quick-play';
import { emptyProgress } from '../progress';
import { seededRng } from '../challenge';
import type { AppQuestion } from '../types';
const bank: AppQuestion[] = Array.from({
  length: 8
}, (_, i) => ({
  key: `spelling:${i}`,
  type: 'spelling',
  kind: 'choice',
  prompt: `문제${i}`,
  answer: `답${i}`,
  choices: [`답${i}`, '다른 답'],
  explain: '규칙',
  source: 'original',
  easy: true
}));
const opts = () => ({
  now: new Date(2026, 10, 22, 12).getTime(),
  rng: seededRng('quick')
});
test('five_choice_questions_with_distinct_answers', () => {
  const qs = pickQuickRound(bank, emptyProgress(), opts());
  expect(qs).toHaveLength(5);
  expect(new Set(qs.map(q => q.answer)).size).toBe(5);
  expect(qs.every(q => q.kind === 'choice')).toBe(true);
});
test('fewer_than_five_returns_three_or_four_and_fewer_than_three_hides_entry', () => {
  expect(pickQuickRound(bank.slice(0, 3), emptyProgress(), opts())).toHaveLength(3);
  expect(pickQuickRound(bank.slice(0, 2), emptyProgress(), opts())).toEqual([]);
});
test('no_spacing_or_unconvertible_typed_question', () => {
  expect(pickQuickRound([{
    ...bank[0],
    kind: 'spacing',
    type: 'spacing',
    syllables: ['가', '나'],
    answers: ['가 나']
  }, ...bank.slice(1)], emptyProgress(), opts()).every(q => q.kind === 'choice')).toBe(true);
});
test('due_question_limit_is_one', () => {
  const p = emptyProgress();
  for (const q of bank.slice(0, 3)) p.stats[q.key] = {
    seen: 1,
    correct: 0,
    lastAt: 1,
    needsReview: true,
    box: 1,
    dueDay: '2026-11-22',
    wrong: 1
  };
  const qs = pickQuickRound(bank, p, opts());
  expect(qs.filter(q => p.stats[q.key]?.needsReview)).toHaveLength(1);
});
