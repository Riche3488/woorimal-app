// 오늘의 낱말: 묶음의 cards(웹 자체 학습 낱말) 가운데 날짜로 하나를 고른다. 모두에게 같은 카드다.
import { CHALLENGE_EPOCH } from './challenge';
import { dayDiff } from './growth';
import type { AppCard, AppQuestion } from './types';

export function cardOfDay(cards: AppCard[] | undefined, day: string): AppCard | null {
  if (!cards?.length) return null;
  const sorted = [...cards].sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
  const n = sorted.length;
  return sorted[((dayDiff(CHALLENGE_EPOCH, day) % n) + n) % n];
}

// 카드 아래에서 바로 푸는 확인 문제(쓰임 문제, 보기형).
export function cardQuestion(card: AppCard, questions: AppQuestion[]): AppQuestion | null {
  const q = questions.find(x => x.key === card.question);
  return q && q.kind === 'choice' ? q : null;
}
