// 오늘의 문제: 날짜만으로 모든 사용자에게 같은 5문제를 낸다(서버 없음). 개인 기록은 쓰지 않는다.
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

const byKey = (a: AppQuestion, b: AppQuestion) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0);

export function pickChallenge(questions: AppQuestion[], day: string): AppQuestion[] {
  const rng = seededRng(`woorimal:${day}`);
  const byType = new Map<string, AppQuestion[]>();
  for (const q of [...questions].sort(byKey)) {
    const list = byType.get(q.type);
    if (list) list.push(q);
    else byType.set(q.type, [q]);
  }
  const types = shuffle([...byType.keys()].sort(), rng);
  const out: AppQuestion[] = [];
  const taken = new Set<string>();
  while (out.length < CHALLENGE_SIZE && taken.size < questions.length) {
    let added = false;
    for (const type of types) {
      if (out.length >= CHALLENGE_SIZE) break;
      const pool = byType.get(type)!.filter(q => !taken.has(q.key));
      if (!pool.length) continue;
      const q = pool[Math.floor(rng() * pool.length)];
      taken.add(q.key);
      out.push(q);
      added = true;
    }
    if (!added) break;
  }
  return out.map(q => (q.choices ? { ...q, choices: shuffle(q.choices, rng) } : { ...q }));
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
