import { checkpointSession, commitSession, discardSession } from '../session-commit';
import { createSession, policyFor, reduceSession } from '../session';
import { defaultSave, type SaveData } from '../../data/save';
import type { AppQuestion } from '../types';
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
const q: AppQuestion = {
  key: 'meaning:1',
  type: 'meaning',
  kind: 'typed',
  prompt: '뜻',
  answer: '가',
  explain: '뜻',
  source: 'original',
  easy: true
};
const start = (mode: 'normal' | 'challenge' = 'normal') => createSession([q], {
  mode,
  day: '2026-11-22',
  packVersion: 'p',
  rulesVersion: '1'
}, 100, 's', policyFor(mode));
test('checkpoint_then_finish_records_answer_once_and_commit_twice_grants_once', () => {
  let session = start();
  let save: SaveData = {
    ...defaultSave(),
    activeSession: session
  };
  session = reduceSession(session, {
    kind: 'answer',
    input: '가',
    answeredAt: 200
  });
  save = checkpointSession(save, session);
  expect(save.progress.stats[q.key].seen).toBe(1);
  expect(save.totalGrains).toBe(0);
  expect(save.activeSession?.phase).toBe('feedback');
  session = reduceSession(save.activeSession!, {
    kind: 'next'
  });
  save = commitSession(checkpointSession(save, session), 's', 300);
  expect(save.totalGrains).toBe(20);
  expect(save.rounds).toBe(1);
  expect(save.progress.stats[q.key].seen).toBe(1);
  expect(commitSession(save, 's', 400)).toBe(save);
  expect(save.lastOutcome?.session.round.results).toHaveLength(1);
});
test('stale_draft_cannot_overwrite_submitted_feedback_and_star_survives', () => {
  const original = start();
  const session = reduceSession(original, {
    kind: 'answer',
    input: '가',
    answeredAt: 200
  });
  const save = checkpointSession({
    ...defaultSave(),
    activeSession: original
  }, session);
  expect(checkpointSession(save, original)).toBe(save);
  expect(checkpointSession({
    ...save,
    progress: {
      ...save.progress,
      stats: {
        ...save.progress.stats,
        [q.key]: {
          ...save.progress.stats[q.key],
          starred: true
        }
      }
    }
  }, session).progress.stats[q.key].starred).toBe(true);
});
test('challenge_cross_midnight_keeps_start_day_and_does_not_replace_newer_day', () => {
  let s = start('challenge');
  let d: SaveData = {
    ...defaultSave(),
    activeSession: s,
    challenge: {
      day: '2026-11-23',
      marks: 'o'
    }
  };
  s = reduceSession(s, {
    kind: 'answer',
    input: '가',
    answeredAt: 200
  });
  d = checkpointSession(d, s);
  s = reduceSession(d.activeSession!, {
    kind: 'next'
  });
  d = commitSession(checkpointSession(d, s), 's', new Date(2026, 10, 23).getTime());
  expect(d.challenge).toEqual({
    day: '2026-11-23',
    marks: 'o'
  });
  expect(d.challengeHistory?.['2026-11-22']).toBe('o');
});
test('discard_keeps_answer_record_without_granting_incomplete_reward', () => {
  const original = start();
  const d = checkpointSession({
    ...defaultSave(),
    activeSession: original
  }, reduceSession(original, {
    kind: 'answer',
    input: '가',
    answeredAt: 200
  }));
  const next = discardSession(d, 's');
  expect(next.progress.stats[q.key].seen).toBe(1);
  expect(next.activeSession).toBeNull();
  expect(next.totalGrains).toBe(0);
});
test('learning_v2_uses_canonical_reward_on_acknowledgement_and_never_replays_it', () => {
  const original = createSession([q], start().context, 100, 'v2', policyFor('normal', {
    rewardPolicy: 'learning-v2'
  }));
  const submitted = reduceSession(original, {
    kind: 'answer',
    input: '가',
    answeredAt: new Date(2026, 10, 22, 12).getTime()
  });
  let d = checkpointSession({
    ...defaultSave(),
    activeSession: original
  }, submitted);
  expect(d.activeSession!.round.grains).toBe(15);
  expect(d.totalGrains).toBe(0);
  const staleNext = reduceSession(submitted, {
    kind: 'next'
  });
  d = checkpointSession(d, staleNext);
  expect(d.activeSession!.round.grains).toBe(15);
  d = commitSession(d, 'v2', new Date(2026, 10, 22, 12).getTime());
  expect(d.totalGrains).toBe(15);
  expect(d.rewardLedger['2026-11-22']['q:meaning:1'].paid).toBe(true);
  expect(commitSession(d, 'v2', 200)).toBe(d);
});
