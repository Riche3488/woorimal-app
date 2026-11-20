// 오늘의 문제: 날짜만으로 모든 사용자에게 같은 5문제를 낸다(서버 없음). 개인 기록은 쓰지 않는다.
import { normalizeAnswer } from './grading';
import { dayDiff } from './growth';
import type { RoundResult } from './round';
import type { AppQuestion } from './types';

export const CHALLENGE_SIZE = 5;
export const CHALLENGE_EPOCH = '2026-11-19';
export const SHARE_URL = 'https://woorimal-contest.co.kr';

export type Mark = 'o' | 'x' | 't';
export type ChallengeRecord = { day: string | null; marks: string };

// 문자열 해시(FNV-1a)와 mulberry32: 기기·엔진과 관계없이 같은 수열.
function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function seededRng(seed: string): () => number {
  let a = hash(seed);
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(list: T[], rng: () => number): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export const EASY_SLOTS = 3; // 앞 3문제는 쉬운 문제, 뒤 2문제는 변별 문제

// 문제·유형마다 "날짜+key"로 점수를 따로 매겨 가장 낮은 것을 고른다. 묶음 전체를 섞지 않으므로
// 뽑히지 않은 문제가 늘거나 빠져도 그날 문제가 바뀌지 않는다(묶음 버전이 달라도 대부분 같음).
const rank = (day: string, id: string) => hash(`woorimal:${day}:${id}`);

export function pickChallenge(questions: AppQuestion[], day: string): AppQuestion[] {
  const byType = new Map<string, AppQuestion[]>();
  for (const q of questions) {
    const list = byType.get(q.type);
    if (list) list.push(q);
    else byType.set(q.type, [q]);
  }
  const types = [...byType.keys()].sort((a, b) => rank(day, `type:${a}`) - rank(day, `type:${b}`) || (a < b ? -1 : 1));
  const taken = new Set<string>();
  const answers = new Set<string>(); // 같은 정답 낱말은 한 번만
  const out: AppQuestion[] = [];
  for (let slot = 0; out.length < CHALLENGE_SIZE && taken.size < questions.length && slot < CHALLENGE_SIZE * types.length; slot++) {
    const all = byType.get(types[slot % types.length])!.filter(q => !taken.has(q.key) && !answers.has(normalizeAnswer(q.answer)));
    if (!all.length) continue;
    const wantEasy = out.length < EASY_SLOTS;
    const preferred = all.filter(q => q.easy === wantEasy);
    const pool = preferred.length ? preferred : all;
    const q = pool.reduce((best, c) => {
      const d = rank(day, c.key) - rank(day, best.key);
      return d < 0 || (d === 0 && c.key < best.key) ? c : best;
    });
    taken.add(q.key);
    answers.add(normalizeAnswer(q.answer));
    out.push(q);
  }
  // 쉬운 문제를 앞에(어려운 문제가 없는 유형이 변별 자리를 채웠을 수 있으므로 안정 정렬).
  const ordered = [...out.filter(q => q.easy), ...out.filter(q => !q.easy)];
  return ordered.map(q => (q.choices ? { ...q, choices: shuffle(q.choices, seededRng(`woorimal:${day}:${q.key}`)) } : { ...q }));
}

export function challengeNumber(day: string): number {
  return dayDiff(CHALLENGE_EPOCH, day) + 1;
}

export function marksFor(results: Pick<RoundResult, 'correct' | 'timedOut'>[]): string {
  return results.map(r => (r.correct ? 'o' : r.timedOut ? 't' : 'x')).join('');
}

const EMOJI: Record<string, string> = { o: '🟩', x: '🟥', t: '⏰' };
export const marksToEmoji = (marks: string) => [...marks].map(m => EMOJI[m] ?? '⬜').join('');
export const markScore = (marks: string) => [...marks].filter(m => m === 'o').length;

export function shareText({ day, marks, streak }: { day: string; marks: string; streak: number }): string {
  return [
    `우리말 곳간 오늘의 문제 #${challengeNumber(day)}`,
    `${marksToEmoji(marks)} ${markScore(marks)}/${marks.length}`,
    ...(streak > 0 ? [`🔥 ${streak}일 연속`] : []),
    SHARE_URL,
  ].join('\n');
}
