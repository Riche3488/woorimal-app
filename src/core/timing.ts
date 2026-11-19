import type { AppQuestion } from './types';

// 문제 유형별 제한 시간(ms). 수치는 플레이 테스트로 조정한다.
export function timeLimitMs(q: AppQuestion): number {
  switch (q.kind) {
    case 'choice': return q.prompt.length <= 30 ? 8000 : 12000;
    case 'typed': return 20000;
    case 'spacing': return Math.min(25000, 6000 + 400 * (q.syllables?.length ?? 0));
  }
}
