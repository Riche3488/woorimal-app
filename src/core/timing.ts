import type { AppQuestion } from './types';

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

// 문제 유형별 제한 시간(ms). 읽을 양에 비례하게 준다. 수치는 플레이 테스트로 조정한다.
export function timeLimitMs(q: AppQuestion): number {
  switch (q.kind) {
    case 'choice': {
      const chars = q.prompt.length + (q.choices ?? []).reduce((n, c) => n + c.length, 0);
      return clamp(6000 + 60 * chars, 8000, 20000);
    }
    case 'typed': return 20000;
    case 'spacing': return Math.min(45000, 6000 + 400 * (q.syllables?.length ?? 0));
  }
}
