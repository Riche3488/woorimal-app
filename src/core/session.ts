import { grade } from './grading';
import { validQuestion } from './pack';
import { answer, beginQuestion, canSubmit, giveUp, isOver, startRound, timeout, type Round } from './round';
import { timeLimitMs } from './timing';
import type { AnswerInput, AppQuestion, QuestionType } from './types';
export type RoundMode = 'normal' | 'review' | 'challenge' | 'starred' | 'practice' | 'quick';
export type RewardPolicy = 'legacy-v1' | 'learning-v2';
export type RoundPolicy = {
  hearts: number | null;
  timed: boolean;
  retry: boolean;
  autoAdvanceCorrectMs: 3000 | null;
  rewardPolicy: RewardPolicy;
};
export type SessionContext = {
  mode: RoundMode;
  practiceType?: QuestionType;
  day: string;
  packVersion: string;
  rulesVersion: string;
  count?: number;
};
export type SessionSnapshot = {
  schema: 1;
  id: string;
  revision: number;
  context: SessionContext;
  policy: RoundPolicy;
  round: Round;
  phase: 'question' | 'feedback' | 'retry' | 'ready-to-finish';
  draft: AnswerInput;
  questionElapsedMs: number;
  feedbackElapsedMs: number;
  autoAdvanceCancelled: boolean;
  paused: boolean;
  recordedCount: number;
  retryCorrect?: boolean;
  masteredCount?: number;
};
export type SessionAction = {
  kind: 'draft';
  input: AnswerInput;
} | {
  kind: 'tick';
  deltaMs: number;
  answeredAt?: number;
} | {
  kind: 'answer';
  input: AnswerInput;
  answeredAt: number;
} | {
  kind: 'giveup';
  answeredAt: number;
} | {
  kind: 'retry';
  input: AnswerInput;
} | {
  kind: 'pause' | 'resume' | 'next' | 'reveal' | 'cancelAutoAdvance';
};
export function policyFor(mode: RoundMode, opts: {
  autoAdvanceCorrect?: boolean;
  rewardPolicy?: RewardPolicy;
} = {}): RoundPolicy {
  const study = mode === 'review' || mode === 'practice' || mode === 'starred';
  return {
    hearts: study || mode === 'quick' ? null : mode === 'challenge' ? 5 : 3,
    timed: !study && mode !== 'quick',
    retry: study,
    autoAdvanceCorrectMs: opts.autoAdvanceCorrect ? 3000 : null,
    rewardPolicy: opts.rewardPolicy ?? 'legacy-v1'
  };
}
const emptyDraft = (q?: AppQuestion): AnswerInput => q?.kind === 'spacing' ? Array(Math.max(0, (q.syllables?.length ?? 1) - 1)).fill(false) : '';
export function createSession(questions: AppQuestion[], context: SessionContext, now: number, id: string, policy: RoundPolicy): SessionSnapshot {
  return {
    schema: 1,
    id,
    revision: 0,
    context,
    policy,
    round: startRound(questions, now, policy.hearts, {
      timed: policy.timed
    }),
    phase: 'question',
    draft: emptyDraft(questions[0]),
    questionElapsedMs: 0,
    feedbackElapsedMs: 0,
    autoAdvanceCancelled: false,
    paused: false,
    recordedCount: 0
  };
}
function settle(s: SessionSnapshot, round: Round, answeredAt: number): SessionSnapshot {
  const last = round.results.at(-1)!;
  round = {
    ...round,
    ...(s.policy.rewardPolicy === 'learning-v2' ? {
      grains: s.round.grains
    } : {}),
    results: [...round.results.slice(0, -1), {
      ...last,
      answeredAt,
      ...(s.policy.rewardPolicy === 'learning-v2' ? {
        grains: 0
      } : {})
    }]
  };
  return {
    ...s,
    round,
    phase: !last.correct && !last.timedOut && !last.gaveUp && s.policy.retry ? 'retry' : 'feedback',
    feedbackElapsedMs: 0,
    retryCorrect: undefined
  };
}
export function reduceSession(s: SessionSnapshot, a: SessionAction): SessionSnapshot {
  const changed = (next: SessionSnapshot): SessionSnapshot => next === s ? s : {
    ...next,
    revision: s.revision + 1
  };
  if (a.kind === 'pause') return s.paused ? s : changed({
    ...s,
    paused: true,
    autoAdvanceCancelled: s.autoAdvanceCancelled || s.phase !== 'question'
  });
  if (a.kind === 'resume') return !s.paused ? s : changed({
    ...s,
    paused: false
  });
  if (s.paused || s.phase === 'ready-to-finish') return s;
  if (a.kind === 'cancelAutoAdvance') return changed({
    ...s,
    autoAdvanceCancelled: true
  });
  if (a.kind === 'next') {
    if (s.phase !== 'feedback') return s;
    if (isOver(s.round)) return changed({
      ...s,
      phase: 'ready-to-finish'
    });
    return changed({
      ...s,
      round: beginQuestion(s.round, 0),
      phase: 'question',
      draft: emptyDraft(s.round.questions[s.round.index]),
      questionElapsedMs: 0,
      feedbackElapsedMs: 0,
      autoAdvanceCancelled: false,
      retryCorrect: undefined
    });
  }
  if (a.kind === 'reveal' && s.phase === 'retry') return changed({
    ...s,
    phase: 'feedback',
    autoAdvanceCancelled: true
  });
  if (a.kind === 'retry' && s.phase === 'retry') return changed({
    ...s,
    draft: a.input,
    phase: 'feedback',
    retryCorrect: grade(s.round.questions[s.round.index - 1], a.input).correct,
    autoAdvanceCancelled: true
  });
  if (a.kind === 'tick') {
    if (!Number.isFinite(a.deltaMs) || a.deltaMs <= 0) return s;
    if (s.phase === 'feedback') {
      const n = {
        ...s,
        feedbackElapsedMs: s.feedbackElapsedMs + a.deltaMs
      };
      return s.policy.autoAdvanceCorrectMs && !s.autoAdvanceCancelled && s.round.results.at(-1)?.correct && n.feedbackElapsedMs >= s.policy.autoAdvanceCorrectMs ? reduceSession(n, {
        kind: 'next'
      }) : changed(n);
    }
    if (s.phase !== 'question') return s;
    const n = {
      ...s,
      questionElapsedMs: s.questionElapsedMs + a.deltaMs
    };
    if (s.policy.timed && n.questionElapsedMs >= timeLimitMs(s.round.questions[s.round.index])) {
      return changed(settle(n, timeout(s.round, s.round.startedAt + n.questionElapsedMs), a.answeredAt ?? s.round.startedAt + n.questionElapsedMs));
    }
    return changed(n);
  }
  if (a.kind === 'draft' && (s.phase === 'question' || s.phase === 'retry')) return changed({
    ...s,
    draft: a.input
  });
  if (s.phase !== 'question') return s;
  const q = s.round.questions[s.round.index];
  if (!q) return s;
  if (a.kind === 'answer' && canSubmit(q, a.input)) return changed(settle({
    ...s,
    draft: a.input
  }, answer(s.round, a.input, s.round.startedAt + s.questionElapsedMs), a.answeredAt));
  if (a.kind === 'giveup') return changed(settle(s, giveUp(s.round, s.round.startedAt + s.questionElapsedMs), a.answeredAt));
  return s;
}

// Persisted sessions are untrusted. A broken session must not take accumulated records with it.
export function parseSession(raw: unknown): SessionSnapshot | null {
  const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
  const nonneg = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0;
  const integer = (v: unknown): v is number => nonneg(v) && Number.isSafeInteger(v);
  const types = ['meaning', 'usage', 'spacing', 'spelling', 'proverb', 'chosung', 'broadcast'];
  if (!object(raw)) return null;
  const s = raw as unknown as SessionSnapshot;
  const r = s.round,
    p = s.policy,
    c = s.context;
  if (s.schema !== 1 || typeof s.id !== 'string' || !s.id || !integer(s.revision) || !object(c) || !['normal', 'review', 'challenge', 'starred', 'practice', 'quick'].includes(c.mode) || !/^\d{4}-\d{2}-\d{2}$/.test(c.day) || typeof c.packVersion !== 'string' || typeof c.rulesVersion !== 'string') return null;
  if (c.practiceType !== undefined && !types.includes(c.practiceType)) return null;
  if (c.count !== undefined && (!integer(c.count) || c.count < 1 || c.count > 10)) return null;
  if (!object(p) || typeof p.timed !== 'boolean' || typeof p.retry !== 'boolean' || !(p.hearts === null || integer(p.hearts) && p.hearts > 0) || ![null, 3000].includes(p.autoAdvanceCorrectMs) || !['legacy-v1', 'learning-v2'].includes(p.rewardPolicy)) return null;
  if (!object(r) || !Array.isArray(r.questions) || !r.questions.length || r.questions.length > 100 || !r.questions.every(validQuestion) || !integer(r.index) || r.index > r.questions.length || !Array.isArray(r.results) || r.results.length !== r.index) return null;
  if (!r.results.every((v, i) => object(v) && v.key === r.questions[i].key && v.type === r.questions[i].type && (['correct', 'timedOut', 'gaveUp', 'synonymHit'] as const).every(f => typeof v[f] === 'boolean') && !(v.correct && (v.timedOut || v.gaveUp)) && typeof v.userAnswer === 'string' && nonneg(v.elapsedMs) && integer(v.grains) && (v.answeredAt === undefined || nonneg(v.answeredAt)))) return null;
  if (!(r.hearts === null || integer(r.hearts)) || !integer(r.grains) || !nonneg(r.startedAt) || !integer(r.streak)) return null;
  if (r.policy !== undefined && (!object(r.policy) || r.policy.timed !== p.timed)) return null;
  const expectedHearts = p.hearts === null ? null : p.hearts - r.results.filter(v => !v.correct).length;
  const trailingCorrect = [...r.results].reverse().findIndex(v => !v.correct);
  if (r.hearts !== expectedHearts || r.grains !== r.results.reduce((n, v) => n + v.grains, 0) || r.streak !== (trailingCorrect < 0 ? r.results.length : trailingCorrect)) return null;
  if (!['question', 'feedback', 'retry', 'ready-to-finish'].includes(s.phase) || !nonneg(s.questionElapsedMs) || !nonneg(s.feedbackElapsedMs) || typeof s.paused !== 'boolean' || typeof s.autoAdvanceCancelled !== 'boolean' || !integer(s.recordedCount) || s.recordedCount > r.results.length) return null;
  if (s.masteredCount !== undefined && !integer(s.masteredCount) || s.retryCorrect !== undefined && typeof s.retryCorrect !== 'boolean') return null;
  if (s.phase === 'question' ? isOver(r) : !r.results.length) return null;
  if (s.phase === 'ready-to-finish' && (!isOver(r) || s.recordedCount !== r.results.length)) return null;
  const last = r.results.at(-1);
  if (s.phase === 'retry' && (!p.retry || last!.correct || last!.timedOut || last!.gaveUp)) return null;
  const current = r.questions[s.phase === 'question' ? r.index : r.index - 1];
  if (current.kind === 'spacing') {
    if (!Array.isArray(s.draft) || s.draft.length !== current.syllables!.length - 1 || !s.draft.every(v => typeof v === 'boolean')) return null;
  } else if (typeof s.draft !== 'string') return null;
  return s;
}
