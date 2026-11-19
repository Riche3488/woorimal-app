// 테스트 모드: 답을 몰라도 앱 기능을 확인할 수 있게 정답·오답 입력을 만든다.
import { spacingGaps } from './grading';
import type { AnswerInput, AppQuestion } from './types';

export function correctInput(q: AppQuestion): AnswerInput {
  if (q.kind === 'spacing') return spacingGaps(q.answers?.[0] ?? q.answer).gaps;
  return q.answer;
}

export function wrongInput(q: AppQuestion): AnswerInput {
  if (q.kind === 'spacing') return (correctInput(q) as boolean[]).map(g => !g);
  if (q.kind === 'choice') return (q.choices ?? []).find(c => c !== q.answer) ?? '틀린답';
  return '틀린답';
}
