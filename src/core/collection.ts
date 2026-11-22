// 곳간 낱말: 외운 문제(간격 복습을 마친 문제)의 정답 낱말을 하나씩 모은다. 같은 낱말의 첫소리·뜻 문제는 한 낱말로 센다.
import { normalizeAnswer } from './grading';
import type { Progress } from './progress';
import type { AppQuestion, QuestionType } from './types';
import type { Discovery } from './activity';
import type { SaveData } from '../data/save';

// 정답이 낱말인 유형만(띄어쓰기·쓰임은 문장, 속담은 활용형 빈칸이라 뺀다).
const WORD_TYPES = new Set<QuestionType>(['meaning', 'chosung', 'spelling']);
export type CollectedWord = {
  word: string;
  explain: string;
  lastAt: number;
};
export function wordCollection(p: Progress, questions: AppQuestion[]): {
  mastered: CollectedWord[];
  known: number;
} {
  const mastered = new Map<string, CollectedWord>();
  const known = new Set<string>();
  for (const q of questions) {
    const s = p.stats[q.key];
    if (!s || !WORD_TYPES.has(q.type)) continue;
    const id = normalizeAnswer(q.answer);
    if (s.correct > 0) known.add(id);
    if (!s.mastered) continue;
    const prev = mastered.get(id);
    mastered.set(id, {
      word: prev?.word ?? q.answer,
      explain: prev?.explain || q.explain,
      lastAt: Math.max(prev?.lastAt ?? 0, s.lastAt)
    });
  }
  return {
    mastered: [...mastered.values()].sort((a, b) => b.lastAt - a.lastAt),
    known: known.size
  };
}
export function discoveredWords(p: Progress, questions: AppQuestion[], extras: Record<string, Discovery> = {}): Discovery[] {
  const words = {
    ...extras
  };
  for (const q of questions) {
    const s = p.stats[q.key];
    if (!s?.correct || !WORD_TYPES.has(q.type)) continue;
    const id = normalizeAnswer(q.answer),
      old = words[id];
    words[id] = {
      word: q.answer,
      at: old?.at ?? s.lastAt,
      explain: old?.explain || q.explain,
      ...(old?.masteredAt !== undefined ? {
        masteredAt: old.masteredAt
      } : s.mastered ? {
        masteredAt: s.lastAt
      } : {})
    };
  }
  return Object.values(words).sort((a, b) => b.at - a.at);
}
export function seedDiscoveries(save: SaveData, questions: AppQuestion[]): SaveData {
  return {
    ...save,
    discoveries: Object.fromEntries(discoveredWords(save.progress, questions, save.discoveries).map(w => [normalizeAnswer(w.word), w]))
  };
}
