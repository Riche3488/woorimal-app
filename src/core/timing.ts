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
    // 문장을 읽고 띄울 자리를 하나씩 눌러야 하므로 넉넉히 준다(10초 + 음절당 0.7초, 15~70초).
    case 'spacing': return clamp(10000 + 700 * (q.syllables?.length ?? 0), 15000, 70000);
  }
}
