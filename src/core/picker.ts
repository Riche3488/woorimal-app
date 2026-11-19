// 출제: 처음 보는 유형은 쉬운 문제부터, 하루 지난 틀린 문제는 다시, 안 푼 문제를 먼저.
import { reviewKeys, type Progress } from './progress';
import { ROUND_SIZE } from './round';
import type { AppQuestion } from './types';

export const EASY_FIRST_TRIES = 20;
const DAY_MS = 86_400_000;
const MAX_DUE_IN_ROUND = 2;

type Rng = () => number;

function shuffle<T>(list: T[], rng: Rng): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const withShuffledChoices = (q: AppQuestion, rng: Rng): AppQuestion =>
  q.choices ? { ...q, choices: shuffle(q.choices, rng) } : { ...q };

// 유형을 돌아가며 하나씩 뽑아 문제 수가 적은 유형도 빠지지 않게 한다.
function roundRobin(queues: AppQuestion[][], count: number): AppQuestion[] {
  const qs = queues.map(q => [...q]).filter(q => q.length);
  const out: AppQuestion[] = [];
  while (out.length < count && qs.some(q => q.length)) {
    for (const q of qs) {
      if (out.length >= count) break;
      if (q.length) out.push(q.shift()!);
    }
  }
  return out;
}

export function pickRound(
  questions: AppQuestion[],
  p: Progress,
  { count = ROUND_SIZE, rng = Math.random, now }: { count?: number; rng?: Rng; now: number },
): AppQuestion[] {
  const byKey = new Map(questions.map(q => [q.key, q]));
  const due = reviewKeys(p, questions)
    .filter(k => (p.stats[k].lastWrongAt ?? 0) <= now - DAY_MS)
    .slice(0, MAX_DUE_IN_ROUND)
    .map(k => byKey.get(k)!);
  const taken = new Set(due.map(q => q.key));

  const byType = new Map<string, AppQuestion[]>();
  for (const q of questions) {
    if (taken.has(q.key)) continue;
    const list = byType.get(q.type);
    if (list) list.push(q);
    else byType.set(q.type, [q]);
  }
  const unseen: AppQuestion[][] = [];
  const seen: AppQuestion[][] = [];
  for (const [type, list] of shuffle([...byType.entries()], rng)) {
    const easy = list.filter(q => q.easy);
    const pool = (p.triesByType[type] ?? 0) < EASY_FIRST_TRIES && easy.length ? easy : list;
    unseen.push(shuffle(pool.filter(q => !p.stats[q.key]), rng));
    seen.push(pool.filter(q => p.stats[q.key]).sort((a, b) => p.stats[a.key].lastAt - p.stats[b.key].lastAt));
  }
  const need = count - due.length;
  const fresh = roundRobin(unseen, need);
  const rest = fresh.length < need ? roundRobin(seen, need - fresh.length) : [];
  return shuffle([...due, ...fresh, ...rest], rng).map(q => withShuffledChoices(q, rng));
}

export function pickReviewRound(
  questions: AppQuestion[],
  p: Progress,
  { count = ROUND_SIZE, rng = Math.random }: { count?: number; rng?: Rng } = {},
): AppQuestion[] {
  const byKey = new Map(questions.map(q => [q.key, q]));
  return reviewKeys(p, questions).slice(0, count).map(k => withShuffledChoices(byKey.get(k)!, rng));
}
