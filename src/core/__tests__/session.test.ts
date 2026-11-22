import { createSession, policyFor, reduceSession, parseSession } from '../session';
import type { AppQuestion } from '../types';
const q = (n: number): AppQuestion => ({key: `meaning:${n}`, type: 'meaning', kind: 'typed', prompt: `문제${n}`, answer: '가', explain: '해설', easy: true, source: 'original'});
const start = (mode: 'normal' | 'review' = 'normal') => createSession([q(1), q(2), q(3), q(4)], {mode, day: '2026-11-22', packVersion: 'p', rulesVersion: '1'}, 100, 's', policyFor(mode));
test('background_30_minutes_preserves_remaining_15_seconds_and_draft', () => {
  let s = reduceSession(start(), {kind:'tick', deltaMs:5000});
  s = reduceSession(s, {kind:'draft', input:'가나'});
  s = reduceSession(s, {kind:'pause'});
  s = reduceSession(s, {kind:'tick', deltaMs:1800000});
  expect(s.questionElapsedMs).toBe(5000);
  expect(parseSession(JSON.parse(JSON.stringify(s)))?.draft).toBe('가나');
  s = reduceSession(s, {kind:'resume'});
  s = reduceSession(s, {kind:'answer', input:'가', answeredAt:200});
  expect(s.round.results[0]).toMatchObject({correct:true, elapsedMs:5000, answeredAt:200});
});
test('feedback_does_not_spend_next_question_time_and_double_submit_has_one_result', () => {
  let s = reduceSession(start(), {kind:'answer', input:'가', answeredAt:200});
  s = reduceSession(s, {kind:'answer', input:'가', answeredAt:201});
  s = reduceSession(s, {kind:'tick', deltaMs:100000});
  expect(s.round.results).toHaveLength(1);
  expect(s.phase).toBe('feedback');
  s = reduceSession(s, {kind:'next'});
  expect(s.questionElapsedMs).toBe(0);
  expect(s.phase).toBe('question');
});
test('review_has_no_hearts_or_timeout_and_retry_keeps_independent_wrong', () => {
  let s = reduceSession(start('review'), {kind:'tick', deltaMs:600000});
  s = reduceSession(s, {kind:'answer', input:'나', answeredAt:200});
  expect(s.round.hearts).toBeNull();
  expect(s.round.results[0].timedOut).toBe(false);
  expect(s.phase).toBe('retry');
  s = reduceSession(s, {kind:'retry', input:'가'});
  expect(s.round.results[0].correct).toBe(false);
  expect(s.retryCorrect).toBe(true);
  expect(s.phase).toBe('feedback');
});
test('clock_rollback_does_not_add_time_and_invalid_snapshot_is_rejected', () => {
  const s = reduceSession(start(), {kind:'tick', deltaMs:-500});
  expect(s.questionElapsedMs).toBe(0);
  expect(parseSession({...s, round:{...s.round, index:99}})).toBeNull();
  expect(parseSession({...s, schema:99})).toBeNull();
});
test('snapshot_preserves_choices_and_feedback_and_pause_cancels_auto', () => {
  const policy = policyFor('normal', {autoAdvanceCorrect:true});
  let s = createSession([q(1), q(2)], start().context, 100, 's', policy);
  s = reduceSession(s, {kind:'answer', input:'가', answeredAt:200});
  s = reduceSession(s, {kind:'pause'});
  s = reduceSession(s, {kind:'resume'});
  s = reduceSession(s, {kind:'tick', deltaMs:4000});
  expect(s.phase).toBe('feedback');
  expect(parseSession(JSON.parse(JSON.stringify(s)))?.round.questions).toEqual([q(1),q(2)]);
});
