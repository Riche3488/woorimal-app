import { cardOfDay, cardQuestion } from '../cards';
import type { AppCard, AppQuestion } from '../types';

const card = (id: string): AppCard => ({ key: `card:${id}`, word: id, title: `${id}: 제목`, pos: '동사', meaning: '뜻', explain: '설명', tip: '팁', examples: ['예문'], question: `usage:${id}` });
const cards = ['b', 'a', 'c'].map(card);

test('cardOfDay: 날짜만으로 정해지고(묶음 순서와 무관), 날마다 돌아가며 모든 카드가 나온다', () => {
  const days = ['2026-11-19', '2026-11-20', '2026-11-21'];
  const picked = days.map(d => cardOfDay(cards, d)!.key);
  expect(new Set(picked).size).toBe(3);
  expect(cardOfDay([...cards].reverse(), '2026-11-20')!.key).toBe(picked[1]);
  expect(cardOfDay(cards, '2026-11-22')!.key).toBe(picked[0]);
});

test('cardOfDay: 카드가 없으면 null', () => {
  expect(cardOfDay([], '2026-11-20')).toBeNull();
  expect(cardOfDay(undefined, '2026-11-20')).toBeNull();
});

test('cardQuestion: 확인 문제를 묶음에서 찾는다(보기형만)', () => {
  const q: AppQuestion = { key: 'usage:a', type: 'usage', kind: 'choice', prompt: 'p', answer: 'x', choices: ['x', 'y'], explain: '', source: 'original', easy: true };
  expect(cardQuestion(card('a'), [q])).toBe(q);
  expect(cardQuestion(card('b'), [q])).toBeNull();
});
