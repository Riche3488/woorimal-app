import { grade } from './grading';
import { answer, beginQuestion, canSubmit, giveUp, isOver, startRound, timeout, type Round } from './round';
import { timeLimitMs } from './timing';
import type { AnswerInput, AppQuestion, QuestionType } from './types';

export type RoundMode = 'normal' | 'review' | 'challenge' | 'starred' | 'practice' | 'quick';
export type RewardPolicy = 'legacy-v1' | 'learning-v2';
export type RoundPolicy = { hearts: number | null; timed: boolean; retry: boolean; autoAdvanceCorrectMs: 3000 | null; rewardPolicy: RewardPolicy };
export type SessionContext = { mode: RoundMode; practiceType?: QuestionType; day: string; packVersion: string; rulesVersion: string };
export type SessionSnapshot = {
  schema: 1; id: string; revision: number; context: SessionContext; policy: RoundPolicy;
  round: Round; phase: 'question' | 'feedback' | 'retry' | 'ready-to-finish'; draft: AnswerInput;
  questionElapsedMs: number; feedbackElapsedMs: number; autoAdvanceCancelled: boolean;
  paused: boolean; recordedCount: number; retryCorrect?: boolean; masteredCount?: number;
};
export type SessionAction =
  | { kind: 'draft'; input: AnswerInput }
  | { kind: 'tick'; deltaMs: number; answeredAt?: number }
  | { kind: 'answer'; input: AnswerInput; answeredAt: number }
  | { kind: 'giveup'; answeredAt: number }
  | { kind: 'retry'; input: AnswerInput }
  | { kind: 'pause' | 'resume' | 'next' | 'reveal' | 'cancelAutoAdvance' };

export function policyFor(mode: RoundMode, opts: { autoAdvanceCorrect?: boolean; rewardPolicy?: RewardPolicy } = {}): RoundPolicy {
  const study = mode === 'review' || mode === 'practice' || mode === 'starred';
  return { hearts: study || mode === 'quick' ? null : mode === 'challenge' ? 5 : 3,
    timed: !study && mode !== 'quick', retry: study,
    autoAdvanceCorrectMs: opts.autoAdvanceCorrect ? 3000 : null, rewardPolicy: opts.rewardPolicy ?? 'legacy-v1' };
}
const emptyDraft = (q?: AppQuestion): AnswerInput => q?.kind === 'spacing' ? Array(Math.max(0, (q.syllables?.length ?? 1) - 1)).fill(false) : '';
export function createSession(questions: AppQuestion[], context: SessionContext, now: number, id: string, policy: RoundPolicy): SessionSnapshot {
  return { schema:1, id, revision:0, context, policy, round:startRound(questions, now, policy.hearts, {timed:policy.timed}), phase:'question',
    draft:emptyDraft(questions[0]), questionElapsedMs:0, feedbackElapsedMs:0, autoAdvanceCancelled:false, paused:false, recordedCount:0 };
}
function settle(s: SessionSnapshot, round: Round, answeredAt: number): SessionSnapshot {
  const last = round.results.at(-1)!;
  round = { ...round, results: [...round.results.slice(0,-1), { ...last, answeredAt }] };
  return { ...s, round, phase:!last.correct && !last.timedOut && !last.gaveUp && s.policy.retry ? 'retry' : 'feedback', feedbackElapsedMs:0, retryCorrect:undefined };
}
export function reduceSession(s: SessionSnapshot, a: SessionAction): SessionSnapshot {
  const changed = (next: SessionSnapshot): SessionSnapshot => next === s ? s : { ...next, revision:s.revision+1 };
  if (a.kind === 'pause') return s.paused ? s : changed({ ...s, paused:true, autoAdvanceCancelled:s.autoAdvanceCancelled || s.phase !== 'question' });
  if (a.kind === 'resume') return !s.paused ? s : changed({ ...s, paused:false });
  if (s.paused || s.phase === 'ready-to-finish') return s;
  if (a.kind === 'cancelAutoAdvance') return changed({ ...s, autoAdvanceCancelled:true });
  if (a.kind === 'next') {
    if (s.phase !== 'feedback') return s;
    if (isOver(s.round)) return changed({ ...s, phase:'ready-to-finish' });
    return changed({ ...s, round:beginQuestion(s.round, 0), phase:'question', draft:emptyDraft(s.round.questions[s.round.index]), questionElapsedMs:0, feedbackElapsedMs:0, autoAdvanceCancelled:false, retryCorrect:undefined });
  }
  if (a.kind === 'reveal' && s.phase === 'retry') return changed({ ...s, phase:'feedback', autoAdvanceCancelled:true });
  if (a.kind === 'retry' && s.phase === 'retry') return changed({ ...s, draft:a.input, phase:'feedback', retryCorrect:grade(s.round.questions[s.round.index-1], a.input).correct, autoAdvanceCancelled:true });
  if (a.kind === 'tick') {
    if (!Number.isFinite(a.deltaMs) || a.deltaMs <= 0) return s;
    if (s.phase === 'feedback') {
      const n = { ...s, feedbackElapsedMs:s.feedbackElapsedMs+a.deltaMs };
      return s.policy.autoAdvanceCorrectMs && !s.autoAdvanceCancelled && s.round.results.at(-1)?.correct && n.feedbackElapsedMs >= s.policy.autoAdvanceCorrectMs
        ? reduceSession(n, {kind:'next'}) : changed(n);
    }
    if (s.phase !== 'question') return s;
    const n = { ...s, questionElapsedMs:s.questionElapsedMs+a.deltaMs };
    if (s.policy.timed && n.questionElapsedMs >= timeLimitMs(s.round.questions[s.round.index])) {
      return changed(settle(n, timeout(s.round, s.round.startedAt+n.questionElapsedMs), a.answeredAt ?? s.round.startedAt+n.questionElapsedMs));
    }
    return changed(n);
  }
  if (s.phase !== 'question') return s;
  if (a.kind === 'draft') return changed({ ...s, draft:a.input });
  const q = s.round.questions[s.round.index];
  if (!q) return s;
  if (a.kind === 'answer' && canSubmit(q, a.input)) return changed(settle({...s,draft:a.input}, answer(s.round, a.input, s.round.startedAt+s.questionElapsedMs), a.answeredAt));
  if (a.kind === 'giveup') return changed(settle(s, giveUp(s.round, s.round.startedAt+s.questionElapsedMs), a.answeredAt));
  return s;
}

// Persisted sessions are untrusted. A broken session must not take accumulated records with it.
export function parseSession(raw: unknown): SessionSnapshot | null {
  if (!raw || typeof raw !== 'object') return null;
  const s = raw as SessionSnapshot, r = s.round, p = s.policy;
  const nonneg = (n: unknown) => typeof n === 'number' && Number.isFinite(n) && n >= 0;
  const integer = (n: unknown) => nonneg(n) && Number.isSafeInteger(n);
  if (s.schema !== 1 || typeof s.id !== 'string' || !s.id || !integer(s.revision) || !s.context
    || !['normal','review','challenge','starred','practice','quick'].includes(s.context.mode)
    || !/^\d{4}-\d{2}-\d{2}$/.test(s.context.day) || typeof s.context.packVersion !== 'string' || typeof s.context.rulesVersion !== 'string'
    || !p || typeof p.timed !== 'boolean' || typeof p.retry !== 'boolean' || !(p.hearts === null || integer(p.hearts))
    || ![null,3000].includes(p.autoAdvanceCorrectMs) || !['legacy-v1','learning-v2'].includes(p.rewardPolicy)
    || !r || !Array.isArray(r.questions) || !r.questions.length || r.questions.length > 100
    || !r.questions.every(q => q && typeof q.key === 'string' && typeof q.answer === 'string' && typeof q.prompt === 'string' && typeof q.explain === 'string' && ['typed','choice','spacing'].includes(q.kind)
      && (q.kind !== 'choice' || Array.isArray(q.choices) && q.choices.includes(q.answer))
      && (q.kind !== 'spacing' || Array.isArray(q.syllables) && Array.isArray(q.answers)))
    || !integer(r.index) || r.index > r.questions.length || !Array.isArray(r.results) || r.results.length !== r.index
    || !r.results.every((v,i) => v && v.key === r.questions[i].key && typeof v.correct === 'boolean' && typeof v.userAnswer === 'string' && nonneg(v.elapsedMs) && nonneg(v.grains))
    || !(r.hearts === null || integer(r.hearts)) || !nonneg(r.grains) || !nonneg(r.startedAt) || !integer(r.streak)
    || !['question','feedback','retry','ready-to-finish'].includes(s.phase) || s.phase === 'question' && isOver(r)
    || s.phase !== 'question' && !r.results.length || !nonneg(s.questionElapsedMs) || !nonneg(s.feedbackElapsedMs)
    || typeof s.paused !== 'boolean' || typeof s.autoAdvanceCancelled !== 'boolean' || !integer(s.recordedCount) || s.recordedCount > r.results.length
    || !(typeof s.draft === 'string' || Array.isArray(s.draft) && s.draft.every(v => typeof v === 'boolean'))) return null;
  return s;
}
