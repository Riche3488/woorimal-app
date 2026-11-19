// 한 판 진행 규칙: 제한 시간·하트·연속 정답·낱알. 화면과 분리한 순수 함수.
import { grade, gapsToSentence, normalizeAnswer } from './grading';
import { timeLimitMs } from './timing';
import type { AnswerInput, AppQuestion } from './types';

export const ROUND_SIZE = 10;
export const START_HEARTS = 3;

export type RoundResult = {
  key: string;
  type: string;
  correct: boolean;
  timedOut: boolean;
  synonymHit: boolean;
  userAnswer: string;
  elapsedMs: number;
  grains: number;
};

export type Round = {
  questions: AppQuestion[];
  index: number;
  hearts: number;
  streak: number;
  grains: number;
  startedAt: number; // 현재 문제를 시작한 시각(ms)
  results: RoundResult[];
};

export function startRound(questions: AppQuestion[], now: number): Round {
  return { questions, index: 0, hearts: START_HEARTS, streak: 0, grains: 0, startedAt: now, results: [] };
}

export function grainsFor(correct: boolean, remainingRatio: number, streakAfter: number): number {
  if (!correct) return 0;
  const mult = streakAfter >= 5 ? 2 : streakAfter >= 3 ? 1.5 : 1;
  return Math.round((10 + Math.round(10 * remainingRatio)) * mult);
}

export function remainingMs(round: Round, now: number): number {
  const q = round.questions[round.index];
  if (!q) return 0;
  return Math.max(0, timeLimitMs(q) - (now - round.startedAt));
}

export function isOver(round: Round): boolean {
  return round.hearts === 0 || round.index >= round.questions.length;
}

export function canSubmit(q: AppQuestion, input: AnswerInput): boolean {
  if (q.kind !== 'typed') return true;
  return normalizeAnswer(input) !== '';
}

function settle(round: Round, now: number, input: AnswerInput | null): Round {
  const q = round.questions[round.index];
  if (!q || isOver(round)) return round;
  const limit = timeLimitMs(q);
  const elapsedMs = now - round.startedAt;
  const timedOut = input === null || elapsedMs > limit;
  const { correct, synonymHit } = timedOut ? { correct: false, synonymHit: false } : grade(q, input!);
  const streak = correct ? round.streak + 1 : 0;
  const grains = grainsFor(correct, Math.max(0, limit - elapsedMs) / limit, streak);
  const userAnswer = input === null ? '' : Array.isArray(input) ? gapsToSentence(q.syllables ?? [], input) : String(input).trim();
  return {
    ...round,
    index: round.index + 1,
    hearts: correct ? round.hearts : round.hearts - 1,
    streak,
    grains: round.grains + grains,
    startedAt: now,
    results: [...round.results, { key: q.key, type: q.type, correct, timedOut, synonymHit, userAnswer, elapsedMs, grains }],
  };
}

export function answer(round: Round, input: AnswerInput, now: number): Round {
  return settle(round, now, input);
}

export function timeout(round: Round, now: number): Round {
  return settle(round, now, null);
}

// 정답·해설을 잠깐 보여 준 뒤 다음 문제를 띄울 때 그 시각부터 제한 시간을 센다.
export function beginQuestion(round: Round, now: number): Round {
  return { ...round, startedAt: now };
}
