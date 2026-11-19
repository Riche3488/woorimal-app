// 문제별 풀이 기록. 키는 묶음의 문제 key(예: "meaning:10").
import type { RoundResult } from './round';
import type { AppQuestion } from './types';

export type QuestionStat = { seen: number; correct: number; lastAt: number; lastWrongAt?: number; needsReview: boolean };
export type Progress = { stats: Record<string, QuestionStat>; triesByType: Record<string, number> };

export function emptyProgress(): Progress {
  return { stats: {}, triesByType: {} };
}

export function recordResults(p: Progress, results: RoundResult[], now: number): Progress {
  const stats = { ...p.stats };
  const triesByType = { ...p.triesByType };
  for (const r of results) {
    const prev = stats[r.key] ?? { seen: 0, correct: 0, lastAt: 0, needsReview: false };
    stats[r.key] = r.correct
      ? { ...prev, seen: prev.seen + 1, correct: prev.correct + 1, lastAt: now, needsReview: false }
      : { ...prev, seen: prev.seen + 1, lastAt: now, lastWrongAt: now, needsReview: true };
    triesByType[r.type] = (triesByType[r.type] ?? 0) + 1;
  }
  return { stats, triesByType };
}

export function typeAccuracy(p: Progress, questions: AppQuestion[]) {
  const byType = new Map<string, { type: string; total: number; correct: number; rate: number }>();
  for (const q of questions) {
    const s = p.stats[q.key];
    if (!s) continue;
    const t = byType.get(q.type) ?? { type: q.type, total: 0, correct: 0, rate: 0 };
    t.total += s.seen;
    t.correct += s.correct;
    byType.set(q.type, t);
  }
  return [...byType.values()]
    .map(t => ({ ...t, rate: t.total ? t.correct / t.total : 0 }))
    .sort((a, b) => a.rate - b.rate);
}

export function reviewKeys(p: Progress, questions: AppQuestion[]): string[] {
  return questions
    .filter(q => p.stats[q.key]?.needsReview)
    .sort((a, b) => (p.stats[b.key].lastWrongAt ?? 0) - (p.stats[a.key].lastWrongAt ?? 0))
    .map(q => q.key);
}
