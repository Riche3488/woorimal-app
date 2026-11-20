import { wordCollection } from '../collection';
import { emptyProgress, type Progress, type QuestionStat } from '../progress';
import type { AppQuestion, QuestionType } from '../types';

const q = (key: string, type: QuestionType, answer: string, explain = ''): AppQuestion =>
  ({ key, type, kind: 'typed', prompt: 'p', answer, explain, source: 'original', easy: true });
const stat = (o: Partial<QuestionStat>): QuestionStat => ({ seen: 1, correct: 1, lastAt: 1, needsReview: false, box: 0, dueDay: null, wrong: 0, ...o });

test('wordCollection: 외운 낱말을 정답 기준으로 하나씩, 최근 순으로. 맞혀 본 낱말 수도 센다', () => {
  const qs = [
    q('meaning:1', 'meaning', '가늘다', '가늘다 · 형용사'), q('chosung:1', 'chosung', '가늘다'),
    q('meaning:2', 'meaning', '간발의 차이'), q('chosung:3', 'chosung', '난방기'),
    q('meaning:4', 'meaning', '모르는말'), q('spacing:1', 'spacing', '할 수 있다'),
  ];
  const p: Progress = { ...emptyProgress(), stats: {
    'meaning:1': stat({ mastered: true, lastAt: 10 }), 'chosung:1': stat({ mastered: true, lastAt: 20 }),
    'meaning:2': stat({ mastered: true, lastAt: 30 }), 'chosung:3': stat({ correct: 1 }),
    'meaning:4': stat({ correct: 0 }), 'spacing:1': stat({ mastered: true }),
  } };
  const c = wordCollection(p, qs);
  expect(c.mastered.map(w => w.word)).toEqual(['간발의 차이', '가늘다']);
  expect(c.mastered[1].explain).toBe('가늘다 · 형용사');
  expect(c.known).toBe(3); // 가늘다·간발의 차이·난방기 (띄어쓰기 문장은 낱말이 아님)
});

test('wordCollection: 기록이 없으면 비어 있다', () => {
  expect(wordCollection(emptyProgress(), [q('meaning:1', 'meaning', '가늘다')])).toEqual({ mastered: [], known: 0 });
});
