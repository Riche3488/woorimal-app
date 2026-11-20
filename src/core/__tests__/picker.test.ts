import { emptyProgress, recordResults, typeAccuracy, reviewKeys, toggleStar } from '../progress';
import { pickRound, pickReviewRound, pickStarredRound, pickTypeRound, EASY_FIRST_TRIES } from '../picker';
import type { RoundResult } from '../round';
import type { AppQuestion, QuestionType } from '../types';

const q = (type: QuestionType, n: number, easy: boolean): AppQuestion => ({
  key: `${type}:${n}`, type, kind: 'choice', prompt: 'p', answer: `${type}${n}`, explain: '', choices: ['a', 'b', 'c'], source: 'original', easy,
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
  test('recordResults: 틀리면 다시 풀 문제, 같은 날 맞혀도 노트에 남음, 유형별 시도 수 증가', () => {
    let p = recordResults(emptyProgress(), [result('meaning:1', false)], NOW);
    expect(p.stats['meaning:1']).toMatchObject({ seen: 1, correct: 0, needsReview: true, lastWrongAt: NOW });
    p = recordResults(p, [result('meaning:1', true)], NOW + 1);
    expect(p.stats['meaning:1']).toMatchObject({ seen: 2, correct: 1, needsReview: true });
    expect(p.triesByType.meaning).toBe(2);
  });
  test('묶음에서 빠진 문제는 다시 풀기에 나오지 않고, 없으면 빈 배열', () => {
    const p = recordResults(emptyProgress(), [result('broadcast:gone', false)], NOW);
    expect(reviewKeys(p, bank())).toEqual([]);
    expect(pickReviewRound(bank(), p, { rng: seeded(), now: NOW })).toEqual([]);
  });
  test('typeAccuracy는 정답률이 낮은 유형부터', () => {
    const p = recordResults(emptyProgress(), [result('meaning:1', true), result('spelling:1', false), result('spelling:2', true)], NOW);
    expect(typeAccuracy(p, bank())).toEqual([
      { type: 'spelling', total: 2, correct: 1, rate: 0.5 },
      { type: 'meaning', total: 1, correct: 1, rate: 1 },
    ]);
  });
});

describe('공부 판', () => {
  test('pickReviewRound: 복습 날 된 문제가 앞, 날 안 된 노트 문제가 뒤(최근 틀린 순), 외운 문제 없음', () => {
    let p = recordResults(emptyProgress(), [result('meaning:1', false)], NOW - 3 * DAY);
    p = recordResults(p, [result('meaning:2', false)], NOW - 2 * DAY);
    p = recordResults(p, [result('spelling:1', false)], NOW - 1000);
    p = recordResults(p, [result('spelling:2', false)], NOW);
    // chosung:1은 외움
    p = recordResults(p, [result('chosung:1', false)], NOW - 20 * DAY);
    for (const back of [19, 16, 9]) p = recordResults(p, [result('chosung:1', true)], NOW - back * DAY);
    const keys = pickReviewRound(bank(), p, { rng: seeded(), now: NOW }).map(x => x.key);
    expect(keys).toEqual(['meaning:1', 'meaning:2', 'spelling:2', 'spelling:1']);
  });
  test('pickStarredRound: ⭐만, 오래전에 푼 순, 묶음에 없는 key 건너뜀', () => {
    let p = recordResults(emptyProgress(), [result('meaning:3', true)], NOW - DAY);
    p = recordResults(p, [result('meaning:4', true)], NOW - 2 * DAY);
    for (const k of ['meaning:3', 'meaning:4', 'broadcast:gone']) p = toggleStar(p, k);
    expect(pickStarredRound(bank(), p, { rng: seeded(), now: NOW }).map(x => x.key)).toEqual(['meaning:4', 'meaning:3']);
  });
  test('pickTypeRound: 그 유형만 10개, 복습 날 된 노트 문제 포함, 어려운 문제도 나온다', () => {
    const p = recordResults(emptyProgress(), [result('spelling:8', false)], NOW - 2 * DAY);
    const picked = pickTypeRound(bank(), p, 'spelling', { rng: seeded(), now: NOW });
    expect(picked).toHaveLength(10);
    expect(picked.every(x => x.type === 'spelling')).toBe(true);
    expect(picked.map(x => x.key)).toContain('spelling:8');
    expect(picked.some(x => !x.easy)).toBe(true);
  });
  test('pickTypeRound: 안 푼 문제를 오래전에 푼 문제보다 먼저', () => {
    const solved = bank().filter(x => x.type === 'meaning' && x.key !== 'meaning:0' && x.key !== 'meaning:1').map(x => result(x.key, true));
    const p = recordResults(emptyProgress(), solved, NOW - DAY);
    const picked = pickTypeRound(bank(), p, 'meaning', { rng: seeded(), now: NOW, count: 2 }).map(x => x.key).sort();
    expect(picked).toEqual(['meaning:0', 'meaning:1']);
  });
  test('pickTypeRound: 그 유형 문제가 모자라면 있는 만큼', () => {
    expect(pickTypeRound(bank(), emptyProgress(), 'spacing', { rng: seeded(), now: NOW })).toEqual([]);
    expect(pickTypeRound(bank(), emptyProgress(), 'meaning', { rng: seeded(), now: NOW, count: 20 })).toHaveLength(10);
  });
});

test('pickRound: ⭐만 누르고 안 푼 문제는 안 푼 문제로 친다', () => {
  // 쉬운 meaning 5개 중 4개는 풀었고, meaning:0은 ⭐만 눌렀다.
  let p = recordResults(emptyProgress(), ['meaning:1', 'meaning:2', 'meaning:3', 'meaning:4'].map(k => result(k, true)), NOW - 1000);
  p = toggleStar(p, 'meaning:0');
  for (let s = 1; s < 6; s++) {
    const keys = pickRound(bank(), p, { rng: seeded(s), now: NOW }).map(x => x.key);
    expect(keys).toContain('meaning:0');
  }
});

describe('한 판에 같은 정답 낱말은 한 번만', () => {
  // 같은 낱말이 첫소리·뜻 두 유형으로 들어 있는 묶음(웹 묶음의 meaning:N·chosung:N 쌍).
  const twins = (): AppQuestion[] => (['meaning', 'chosung'] as QuestionType[]).flatMap(type =>
    Array.from({ length: 8 }, (_, i) => ({ ...q(type, i, true), answer: `낱말 ${i}` })));
  const answers = (list: AppQuestion[]) => list.map(x => x.answer.replace(/s/g, ''));
  test('pickRound', () => {
    for (let s = 1; s < 10; s++) {
      const picked = pickRound(twins(), emptyProgress(), { rng: seeded(s), now: NOW });
      expect(picked).toHaveLength(8);
      expect(new Set(answers(picked)).size).toBe(picked.length);
    }
  });
  test('pickRound: 복습할 문제와 같은 낱말의 새 문제는 내지 않는다', () => {
    const p = recordResults(emptyProgress(), [result('meaning:3', false)], NOW - 2 * DAY);
    for (let s = 1; s < 10; s++) {
      const picked = pickRound(twins(), p, { rng: seeded(s), now: NOW });
      expect(picked.map(x => x.key)).toContain('meaning:3');
      expect(picked.map(x => x.key)).not.toContain('chosung:3');
    }
  });
  test('pickReviewRound·pickStarredRound', () => {
    let p = recordResults(emptyProgress(), ['meaning:1', 'chosung:1', 'meaning:2'].map(k => result(k, false)), NOW - 2 * DAY);
    expect(answers(pickReviewRound(twins(), p, { rng: seeded(), now: NOW }))).toHaveLength(2);
    p = toggleStar(toggleStar(p, 'meaning:5'), 'chosung:5');
    expect(pickStarredRound(twins(), p, { rng: seeded(), now: NOW })).toHaveLength(1);
  });
});
