// 문제별 풀이 기록과 간격 복습(오답노트). 키는 묶음의 문제 key(예: "meaning:10").
// 틀리면 box 1(내일), 복습 날 맞히면 box 2(+3일) → box 3(+7일) → 외움. 복습 날 전에 맞히면 단계 유지.
import { addDays, localDay } from './growth';
import type { RoundResult } from './round';
import type { AppQuestion } from './types';
export const REVIEW_INTERVALS = [1, 3, 7] as const;
export type Box = 0 | 1 | 2 | 3;
export type QuestionStat = {
  seen: number;
  correct: number;
  lastAt: number;
  lastWrongAt?: number;
  needsReview: boolean; // box > 0과 같다(오답노트에 있음)
  box: Box;
  dueDay: string | null; // 다음 복습 날(기기 날짜)
  wrong: number;
  lastAnswer?: string; // 마지막으로 틀린 내 답(모르겠어요·시간 초과면 없음)
  lastMiss?: 'wrong' | 'timeout' | 'giveup';
  starred?: boolean;
  mastered?: boolean;
};
export type RecentAttempt = {
  key: string;
  correct: boolean;
  elapsedMs: number;
  answeredAt: number;
};
export type Progress = {
  stats: Record<string, QuestionStat>;
  triesByType: Record<string, number>;
  recentAttempts?: Record<string, RecentAttempt[]>;
};
export function emptyProgress(): Progress {
  return {
    stats: {},
    triesByType: {}
  };
}
const blankStat = (): QuestionStat => ({
  seen: 0,
  correct: 0,
  lastAt: 0,
  needsReview: false,
  box: 0,
  dueDay: null,
  wrong: 0
});

// 예전 저장(needsReview만 있음)을 새 형식으로 채운다. 새 형식은 그대로 돌려준다.
export function normalizeStat(s: Partial<QuestionStat> & {
  seen: number;
  correct: number;
  lastAt: number;
}): QuestionStat {
  if (typeof s.box === 'number' && s.dueDay !== undefined && typeof s.wrong === 'number') return s as QuestionStat;
  const missed = Math.max(0, s.seen - s.correct);
  const inNote = !!s.needsReview;
  return {
    ...s,
    needsReview: inNote,
    box: inNote ? 1 : 0,
    dueDay: inNote ? addDays(localDay(new Date(s.lastWrongAt ?? s.lastAt)), REVIEW_INTERVALS[0]) : null,
    wrong: inNote ? Math.max(1, missed) : missed
  };
}
function applyResult(prev: QuestionStat, r: RoundResult, now: number, today: string): QuestionStat {
  const base = {
    ...prev,
    seen: prev.seen + 1,
    lastAt: now
  };
  if (!r.correct) {
    const lastMiss = r.gaveUp ? 'giveup' : r.timedOut ? 'timeout' : 'wrong';
    const {
      lastAnswer: _drop,
      ...rest
    } = base;
    return {
      ...rest,
      ...(lastMiss === 'wrong' ? {
        lastAnswer: r.userAnswer
      } : {}),
      lastMiss,
      lastWrongAt: now,
      needsReview: true,
      box: 1,
      dueDay: addDays(today, REVIEW_INTERVALS[0]),
      wrong: prev.wrong + 1,
      mastered: false
    };
  }
  const right = {
    ...base,
    correct: prev.correct + 1
  };
  if (prev.box === 0 || !prev.dueDay || prev.dueDay > today) return right;
  if (prev.box === 3) return {
    ...right,
    box: 0,
    dueDay: null,
    needsReview: false,
    mastered: true
  };
  const box = prev.box + 1 as Box;
  return {
    ...right,
    box,
    dueDay: addDays(today, REVIEW_INTERVALS[box - 1])
  };
}
export function recordResults(p: Progress, results: RoundResult[], now: number): Progress {
  const today = localDay(new Date(now));
  const stats = {
    ...p.stats
  };
  const triesByType = {
    ...p.triesByType
  };
  for (const r of results) {
    stats[r.key] = applyResult(stats[r.key] ?? blankStat(), r, now, today);
    triesByType[r.type] = (triesByType[r.type] ?? 0) + 1;
  }
  return {
    ...p,
    stats,
    triesByType
  };
}
export function toggleStar(p: Progress, key: string): Progress {
  const prev = p.stats[key] ?? blankStat();
  return {
    ...p,
    stats: {
      ...p.stats,
      [key]: {
        ...prev,
        starred: !prev.starred
      }
    }
  };
}
export function typeAccuracy(p: Progress, questions: AppQuestion[]) {
  const byType = new Map<string, {
    type: string;
    total: number;
    correct: number;
    rate: number;
  }>();
  for (const q of questions) {
    const s = p.stats[q.key];
    if (!s || !s.seen) continue;
    const t = byType.get(q.type) ?? {
      type: q.type,
      total: 0,
      correct: 0,
      rate: 0
    };
    t.total += s.seen;
    t.correct += s.correct;
    byType.set(q.type, t);
  }
  return [...byType.values()].map(t => ({
    ...t,
    rate: t.total ? t.correct / t.total : 0
  })).sort((a, b) => a.rate - b.rate);
}
export type NotebookFilter = 'review' | 'starred' | 'mastered';

// 오답노트 목록. 묶음에 없는 key는 빠진다.
export function notebook(p: Progress, questions: AppQuestion[], filter: NotebookFilter, _today: string): AppQuestion[] {
  const st = (q: AppQuestion) => p.stats[q.key];
  if (filter === 'review') {
    return questions.filter(q => (st(q)?.box ?? 0) > 0).sort((a, b) => (st(a).dueDay ?? '').localeCompare(st(b).dueDay ?? '') || st(a).lastAt - st(b).lastAt);
  }
  if (filter === 'starred') return questions.filter(q => st(q)?.starred).sort((a, b) => st(a).lastAt - st(b).lastAt);
  return questions.filter(q => st(q)?.mastered).sort((a, b) => st(b).lastAt - st(a).lastAt);
}
export function notebookCounts(p: Progress, questions: AppQuestion[], today: string) {
  const c = {
    review: 0,
    due: 0,
    starred: 0,
    mastered: 0
  };
  for (const q of questions) {
    const s = p.stats[q.key];
    if (!s) continue;
    if (s.box > 0) {
      c.review++;
      if (s.dueDay && s.dueDay <= today) c.due++;
    }
    if (s.starred) c.starred++;
    if (s.mastered) c.mastered++;
  }
  return c;
}
export function newlyMastered(before: Progress, after: Progress): number {
  return Object.entries(after.stats).filter(([k, s]) => s.mastered && !before.stats[k]?.mastered).length;
}

// 오답노트 key(복습 날 빠른 순).
export function reviewKeys(p: Progress, questions: AppQuestion[], today = localDay(new Date())): string[] {
  return notebook(p, questions, 'review', today).map(q => q.key);
}
export function recordRecentAttempt(p: Progress, q: Pick<AppQuestion, 'key' | 'type' | 'kind'>, r: RoundResult, assisted = false): Progress {
  if (assisted || r.timedOut || r.gaveUp || !Number.isFinite(r.elapsedMs) || r.elapsedMs < 0) return p;
  const id = `${q.type}:${q.kind}`,
    previous = p.recentAttempts?.[id] ?? [];
  return {
    ...p,
    recentAttempts: {
      ...p.recentAttempts,
      [id]: [...previous, {
        key: q.key,
        correct: r.correct,
        elapsedMs: r.elapsedMs,
        answeredAt: r.answeredAt ?? r.elapsedMs
      }].slice(-20)
    }
  };
}
export function normalizeRecentAttempts(raw: unknown): Record<string, RecentAttempt[]> {
  if (!raw || typeof raw !== 'object') return {};
  return Object.fromEntries(Object.entries(raw).filter(([id, list]) => /^(meaning|usage|spacing|spelling|proverb|chosung|broadcast):(typed|choice|spacing)$/.test(id) && Array.isArray(list)).map(([id, list]) => [id, (list as RecentAttempt[]).filter(a => a && typeof a.key === 'string' && typeof a.correct === 'boolean' && Number.isFinite(a.elapsedMs) && a.elapsedMs >= 0 && Number.isFinite(a.answeredAt)).slice(-20)]));
}
