// 출제: 처음 보는 유형은 쉬운 문제부터, 복습 날이 된 오답노트 문제는 다시, 안 푼 문제를 먼저.
import { localDay } from './growth';
import { notebook, type Progress } from './progress';
import { ROUND_SIZE } from './round';
import type { AppQuestion, QuestionType } from './types';

export const EASY_FIRST_TRIES = 20;
const MAX_DUE_IN_ROUND = 2;

type Opts = { count?: number; rng?: Rng; now: number };

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
  const due = dueQuestions(questions, p, now).slice(0, MAX_DUE_IN_ROUND);
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
    unseen.push(shuffle(pool.filter(q => !p.stats[q.key]?.seen), rng));
    seen.push(pool.filter(q => p.stats[q.key]?.seen).sort((a, b) => p.stats[a.key].lastAt - p.stats[b.key].lastAt));
  }
  const need = count - due.length;
  const fresh = roundRobin(unseen, need);
  const rest = fresh.length < need ? roundRobin(seen, need - fresh.length) : [];
  return shuffle([...due, ...fresh, ...rest], rng).map(q => withShuffledChoices(q, rng));
}

// 복습 날이 된 오답노트 문제(오래 밀린 순).
function dueQuestions(questions: AppQuestion[], p: Progress, now: number): AppQuestion[] {
  const today = localDay(new Date(now));
  return notebook(p, questions, 'review', today).filter(q => p.stats[q.key].dueDay! <= today);
}

// 복습 판: 복습 날이 된 문제 먼저, 모자라면 아직 날이 안 된 노트 문제(최근에 틀린 순).
export function pickReviewRound(questions: AppQuestion[], p: Progress, { count = ROUND_SIZE, rng = Math.random, now }: Opts): AppQuestion[] {
  const today = localDay(new Date(now));
  const all = notebook(p, questions, 'review', today);
  const due = all.filter(q => p.stats[q.key].dueDay! <= today);
  const later = all.filter(q => p.stats[q.key].dueDay! > today)
    .sort((a, b) => (p.stats[b.key].lastWrongAt ?? 0) - (p.stats[a.key].lastWrongAt ?? 0));
  return [...due, ...later].slice(0, count).map(q => withShuffledChoices(q, rng));
}

// ⭐ 판: 담은 문제를 오래전에 푼 순으로.
export function pickStarredRound(questions: AppQuestion[], p: Progress, { count = ROUND_SIZE, rng = Math.random, now }: Opts): AppQuestion[] {
  return notebook(p, questions, 'starred', localDay(new Date(now))).slice(0, count).map(q => withShuffledChoices(q, rng));
}

// 유형 연습: 그 유형만. 복습 날이 된 노트 문제 → 안 푼 문제 → 오래전에 푼 문제. 쉬운 문제 우선은 쓰지 않는다.
export function pickTypeRound(questions: AppQuestion[], p: Progress, type: QuestionType, { count = ROUND_SIZE, rng = Math.random, now }: Opts): AppQuestion[] {
  const pool = questions.filter(q => q.type === type);
  const due = dueQuestions(pool, p, now);
  const taken = new Set(due.map(q => q.key));
  const rest = pool.filter(q => !taken.has(q.key));
  const unseen = shuffle(rest.filter(q => !p.stats[q.key]?.seen), rng);
  const seen = rest.filter(q => p.stats[q.key]?.seen).sort((a, b) => p.stats[a.key].lastAt - p.stats[b.key].lastAt);
  return shuffle([...due, ...unseen, ...seen].slice(0, count), rng).map(q => withShuffledChoices(q, rng));
}
