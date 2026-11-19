import { addDays } from '../growth';
import {
  emptyProgress, newlyMastered, normalizeStat, notebook, notebookCounts, recordResults, REVIEW_INTERVALS, toggleStar, type Progress,
} from '../progress';
import type { RoundResult } from '../round';
import type { AppQuestion } from '../types';

const DAY = 86_400_000;
const D0 = new Date(2026, 10, 19, 9).getTime();
const day = (n: number) => D0 + n * DAY;
const q = (n: number): AppQuestion => ({
  key: `meaning:${n}`, type: 'meaning', kind: 'typed', prompt: `뜻${n}`, answer: `답${n}`, explain: '', source: 'original', easy: true,
});
const qs = Array.from({ length: 6 }, (_, i) => q(i));
const res = (n: number, correct: boolean, extra: Partial<RoundResult> = {}): RoundResult => ({
  key: `meaning:${n}`, type: 'meaning', correct, timedOut: false, gaveUp: false, synonymHit: false,
  userAnswer: correct ? `답${n}` : '쌀쌀하다', elapsedMs: 1000, grains: correct ? 10 : 0, ...extra,
});
const rec = (p: Progress, at: number, ...rs: RoundResult[]) => recordResults(p, rs, at);

test('addDays는 달을 넘긴다', () => {
  expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
  expect(addDays('2026-11-19', 7)).toBe('2026-11-26');
});

test('간격은 1·3·7일', () => expect(REVIEW_INTERVALS).toEqual([1, 3, 7]));

describe('recordResults 간격 복습', () => {
  test('틀리면 box 1, 내일 복습, wrong 1, lastAnswer 저장', () => {
    const p = rec(emptyProgress(), day(0), res(1, false));
    expect(p.stats['meaning:1']).toMatchObject({
      box: 1, dueDay: '2026-11-20', wrong: 1, lastAnswer: '쌀쌀하다', lastMiss: 'wrong', needsReview: true, lastWrongAt: day(0),
    });
  });
  test('모르겠어요·시간 초과는 lastAnswer 비움', () => {
    const p = rec(emptyProgress(), day(0),
      res(1, false, { gaveUp: true, userAnswer: '' }), res(2, false, { timedOut: true, userAnswer: '' }));
    expect(p.stats['meaning:1']).toMatchObject({ lastMiss: 'giveup', box: 1 });
    expect(p.stats['meaning:1'].lastAnswer).toBeUndefined();
    expect(p.stats['meaning:2']).toMatchObject({ lastMiss: 'timeout', box: 1 });
    expect(p.stats['meaning:2'].lastAnswer).toBeUndefined();
  });
  test('복습 날 정답이면 1→2(+3일)→3(+7일)→외움', () => {
    let p = rec(emptyProgress(), day(0), res(1, false));
    p = rec(p, day(1), res(1, true));
    expect(p.stats['meaning:1']).toMatchObject({ box: 2, dueDay: '2026-11-23' });
    p = rec(p, day(4), res(1, true));
    expect(p.stats['meaning:1']).toMatchObject({ box: 3, dueDay: '2026-11-30' });
    p = rec(p, day(11), res(1, true));
    expect(p.stats['meaning:1']).toMatchObject({ box: 0, dueDay: null, mastered: true, needsReview: false });
  });
  test('복습 날이 지나서 맞혀도 단계가 오른다', () => {
    let p = rec(emptyProgress(), day(0), res(1, false));
    p = rec(p, day(5), res(1, true));
    expect(p.stats['meaning:1']).toMatchObject({ box: 2, dueDay: '2026-11-27' });
  });
  test('복습 날 전 정답은 단계 유지', () => {
    let p = rec(emptyProgress(), day(0), res(1, false));
    p = rec(p, day(0) + 1000, res(1, true), res(1, true), res(1, true));
    expect(p.stats['meaning:1']).toMatchObject({ box: 1, dueDay: '2026-11-20', correct: 3, needsReview: true });
  });
  test('외운 뒤 다시 틀리면 box 1, mastered false', () => {
    let p = rec(emptyProgress(), day(0), res(1, false));
    p = rec(p, day(1), res(1, true));
    p = rec(p, day(4), res(1, true));
    p = rec(p, day(11), res(1, true));
    p = rec(p, day(12), res(1, false));
    expect(p.stats['meaning:1']).toMatchObject({ box: 1, dueDay: '2026-12-02', mastered: false, wrong: 2 });
  });
  test('노트에 없던 문제 정답은 box 0 유지', () => {
    const p = rec(emptyProgress(), day(0), res(1, true));
    expect(p.stats['meaning:1']).toMatchObject({ box: 0, dueDay: null, wrong: 0, needsReview: false, correct: 1 });
  });
});

describe('toggleStar', () => {
  test('켜고 끈다, 없는 key면 seen 0 기록을 만든다', () => {
    const on = toggleStar(emptyProgress(), 'meaning:3');
    expect(on.stats['meaning:3']).toMatchObject({ seen: 0, correct: 0, lastAt: 0, box: 0, dueDay: null, wrong: 0, needsReview: false, starred: true });
    expect(toggleStar(on, 'meaning:3').stats['meaning:3'].starred).toBe(false);
  });
  test('판 결과를 기록해도 ⭐는 남는다', () => {
    const p = rec(toggleStar(emptyProgress(), 'meaning:3'), day(0), res(3, false));
    expect(p.stats['meaning:3']).toMatchObject({ starred: true, box: 1, seen: 1 });
  });
});

describe('notebook', () => {
  // 1: 이틀 전 틀림(복습 날 지남), 2: 어제 틀림(오늘 복습), 3: 오늘 틀림(내일), 4: 외움, 5: ⭐만
  const build = () => {
    let p = rec(emptyProgress(), day(0), res(1, false));
    p = rec(p, day(1), res(2, false));
    p = rec(p, day(2), res(3, false));
    p = rec(p, day(-20), res(4, false));
    p = rec(p, day(-19), res(4, true));
    p = rec(p, day(-16), res(4, true));
    p = rec(p, day(-9), res(4, true));
    p = toggleStar(p, 'meaning:5');
    p = toggleStar(p, 'meaning:1');
    p = toggleStar(p, 'meaning:99'); // 묶음에 없는 문제
    return p;
  };
  const today = '2026-11-21';
  test('review: 복습 날 된 것(밀린 순) 먼저, 그다음 dueDay 빠른 순', () => {
    expect(notebook(build(), qs, 'review', today).map(x => x.key)).toEqual(['meaning:1', 'meaning:2', 'meaning:3']);
  });
  test('묶음에 없는 key는 빠진다', () => {
    let p = rec(build(), day(0), res(99, false));
    expect(notebook(p, qs, 'review', today).map(x => x.key)).not.toContain('meaning:99');
    expect(notebook(p, qs, 'starred', today).map(x => x.key)).not.toContain('meaning:99');
  });
  test('starred: ⭐만, lastAt 작은 순', () => {
    expect(notebook(build(), qs, 'starred', today).map(x => x.key)).toEqual(['meaning:5', 'meaning:1']);
  });
  test('mastered: 외운 것만', () => {
    expect(notebook(build(), qs, 'mastered', today).map(x => x.key)).toEqual(['meaning:4']);
  });
  test('notebookCounts', () => {
    expect(notebookCounts(build(), qs, today)).toEqual({ review: 3, due: 2, starred: 2, mastered: 1 });
  });
});

test('newlyMastered: 이번에 외운 문제 수', () => {
  let p = rec(emptyProgress(), day(0), res(1, false));
  p = rec(p, day(1), res(1, true));
  p = rec(p, day(4), res(1, true));
  const after = rec(p, day(11), res(1, true));
  expect(newlyMastered(p, after)).toBe(1);
  expect(newlyMastered(after, after)).toBe(0);
});

describe('normalizeStat (예전 기록)', () => {
  test('needsReview면 box 1, 틀린 다음 날 복습', () => {
    expect(normalizeStat({ seen: 2, correct: 0, lastAt: D0, lastWrongAt: D0, needsReview: true }))
      .toMatchObject({ box: 1, dueDay: '2026-11-20', wrong: 2, needsReview: true });
  });
  test('needsReview가 아니면 노트 밖', () => {
    expect(normalizeStat({ seen: 3, correct: 2, lastAt: D0, needsReview: false }))
      .toMatchObject({ box: 0, dueDay: null, wrong: 1, needsReview: false });
  });
  test('새 형식은 그대로', () => {
    const s = rec(emptyProgress(), day(0), res(1, false)).stats['meaning:1'];
    expect(normalizeStat(s)).toEqual(s);
  });
});
