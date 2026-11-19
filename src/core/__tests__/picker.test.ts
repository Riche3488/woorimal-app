import { emptyProgress, recordResults, typeAccuracy, reviewKeys } from '../progress';
import { pickRound, pickReviewRound, EASY_FIRST_TRIES } from '../picker';
import type { RoundResult } from '../round';
import type { AppQuestion, QuestionType } from '../types';

const q = (type: QuestionType, n: number, easy: boolean): AppQuestion => ({
  key: `${type}:${n}`, type, kind: 'choice', prompt: 'p', answer: 'a', explain: '', choices: ['a', 'b', 'c'], source: 'original', easy,
});
const bank = (): AppQuestion[] => {
  const out: AppQuestion[] = [];
  for (const type of ['meaning', 'spelling', 'chosung'] as QuestionType[]) {
    for (let i = 0; i < 10; i++) out.push(q(type, i, i < 5));
  }
  return out;
};
const result = (key: string, correct: boolean): RoundResult => ({
  key, type: key.split(':')[0], correct, timedOut: false, gaveUp: false, synonymHit: false, userAnswer: '', elapsedMs: 1000, grains: correct ? 10 : 0,
});
const seeded = (seed = 1) => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
const DAY = 86_400_000;
const NOW = 100 * DAY;

test('EASY_FIRST_TRIES는 20', () => expect(EASY_FIRST_TRIES).toBe(20));

describe('pickRound', () => {
  test('새 사용자: 10개, 모두 쉬운 문제, 키 중복 없음, 두 유형 이상', () => {
    const picked = pickRound(bank(), emptyProgress(), { rng: seeded(), now: NOW });
    expect(picked).toHaveLength(10);
    expect(picked.every(x => x.easy)).toBe(true);
    expect(new Set(picked.map(x => x.key)).size).toBe(10);
    expect(new Set(picked.map(x => x.type)).size).toBeGreaterThan(1);
  });
  test('그 유형을 20번 이상 풀었으면 어려운 문제도 낸다', () => {
    const p = { ...emptyProgress(), triesByType: { meaning: 20, spelling: 20, chosung: 20 } };
    const seen = new Set<boolean>();
    for (let s = 1; s < 20; s++) pickRound(bank(), p, { rng: seeded(s), now: NOW }).forEach(x => seen.add(x.easy));
    expect(seen.has(false)).toBe(true);
  });
  test('하루 이상 지난 틀린 문제는 최대 2개, 1시간 전 틀린 문제는 넣지 않는다', () => {
    let p = recordResults(emptyProgress(), ['meaning:7', 'meaning:8', 'meaning:9'].map(k => result(k, false)), NOW - 2 * DAY);
    p = recordResults(p, [result('spelling:9', false)], NOW - 3_600_000);
    const picked = pickRound(bank(), p, { rng: seeded(), now: NOW }).map(x => x.key);
    expect(picked.filter(k => ['meaning:7', 'meaning:8', 'meaning:9'].includes(k))).toHaveLength(2);
    expect(picked).not.toContain('spelling:9');
  });
  test('아직 안 푼 문제를 최근 푼 문제보다 먼저 낸다', () => {
    const solved = bank().filter(x => x.easy && x.type === 'meaning').map(x => result(x.key, true));
    const p = recordResults(emptyProgress(), solved, NOW - 1000);
    const picked = pickRound(bank(), p, { rng: seeded(), now: NOW });
    expect(picked.filter(x => x.type === 'meaning' && x.easy)).toHaveLength(0);
  });
  test('보기 순서를 섞은 복사본을 돌려주고 원본은 바꾸지 않는다', () => {
    const b = bank();
    const picked = pickRound(b, emptyProgress(), { rng: seeded(3), now: NOW });
    expect(b.every(x => x.choices!.join() === 'a,b,c')).toBe(true);
    expect(picked.every(x => [...x.choices!].sort().join() === 'a,b,c')).toBe(true);
  });
});

describe('기록', () => {
  test('recordResults: 틀리면 다시 풀 문제, 맞히면 해제, 유형별 시도 수 증가', () => {
    let p = recordResults(emptyProgress(), [result('meaning:1', false)], NOW);
    expect(p.stats['meaning:1']).toMatchObject({ seen: 1, correct: 0, needsReview: true, lastWrongAt: NOW });
    p = recordResults(p, [result('meaning:1', true)], NOW + 1);
    expect(p.stats['meaning:1']).toMatchObject({ seen: 2, correct: 1, needsReview: false });
    expect(p.triesByType.meaning).toBe(2);
  });
  test('묶음에서 빠진 문제는 다시 풀기에 나오지 않고, 없으면 빈 배열', () => {
    const p = recordResults(emptyProgress(), [result('broadcast:gone', false)], NOW);
    expect(reviewKeys(p, bank())).toEqual([]);
    expect(pickReviewRound(bank(), p, { rng: seeded() })).toEqual([]);
  });
  test('reviewKeys는 최근 틀린 순', () => {
    let p = recordResults(emptyProgress(), [result('meaning:1', false)], NOW);
    p = recordResults(p, [result('spelling:2', false)], NOW + 5);
    expect(reviewKeys(p, bank())).toEqual(['spelling:2', 'meaning:1']);
    expect(pickReviewRound(bank(), p, { rng: seeded() }).map(x => x.key)).toEqual(['spelling:2', 'meaning:1']);
  });
  test('typeAccuracy는 정답률이 낮은 유형부터', () => {
    const p = recordResults(emptyProgress(), [result('meaning:1', true), result('spelling:1', false), result('spelling:2', true)], NOW);
    expect(typeAccuracy(p, bank())).toEqual([
      { type: 'spelling', total: 2, correct: 1, rate: 0.5 },
      { type: 'meaning', total: 1, correct: 1, rate: 1 },
    ]);
  });
});
