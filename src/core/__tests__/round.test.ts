import { timeLimitMs } from '../timing';
import { startRound, answer, timeout, beginQuestion, remainingMs, isOver, grainsFor, canSubmit, ROUND_SIZE, START_HEARTS } from '../round';
import type { AppQuestion } from '../types';

const typed = (n: number): AppQuestion => ({
  key: `meaning:${n}`, type: 'meaning', kind: 'typed', prompt: '뜻', answer: `답${n}`, explain: '', source: 'original', easy: true,
});
const choice = (prompt: string): AppQuestion => ({
  key: `spelling:${prompt.length}`, type: 'spelling', kind: 'choice', prompt, answer: '가', explain: '', choices: ['가', '나'], source: 'original', easy: true,
});
const spacing = (n: number): AppQuestion => ({
  key: `spacing:${n}`, type: 'spacing', kind: 'spacing', prompt: 'p', answer: 'x', explain: '', answers: ['x'],
  syllables: Array.from({ length: n }, () => '가'), source: 'blog', easy: true,
});
const ten = () => Array.from({ length: 10 }, (_, i) => typed(i));
const T0 = 1_000_000;

test('상수: 한 판 10문제, 하트 3개', () => {
  expect(ROUND_SIZE).toBe(10);
  expect(START_HEARTS).toBe(3);
});

describe('timeLimitMs', () => {
  test('보기형은 지문과 보기 글자 수에 비례(8~20초)', () => {
    expect(timeLimitMs(choice('a'.repeat(10)))).toBe(8000);
    const usage = { ...choice('‘겉돌다’를 잘못 쓴 문장은?'), choices: Array.from({ length: 5 }, () => '가'.repeat(35)) };
    expect(timeLimitMs(usage)).toBeGreaterThanOrEqual(16000);
    expect(timeLimitMs({ ...choice('a'), choices: ['가'.repeat(500), '나'] })).toBe(20000);
  });
  test('입력형은 20초', () => {
    expect(timeLimitMs(typed(1))).toBe(20000);
  });
  test('띄어쓰기는 10초 + 음절당 0.7초, 하한 15초·상한 70초', () => {
    expect(timeLimitMs(spacing(5))).toBe(15000);
    expect(timeLimitMs(spacing(20))).toBe(24000);
    expect(timeLimitMs(spacing(70))).toBe(59000);
    expect(timeLimitMs(spacing(126))).toBe(70000);
  });
});

describe('진행', () => {
  test('정답 3연속이면 연속 3, 세 번째 낱알에 1.5배', () => {
    let r = startRound(ten(), T0);
    for (let i = 0; i < 3; i++) r = answer(r, `답${i}`, r.startedAt);
    expect(r.streak).toBe(3);
    expect(r.results.map(x => x.grains)).toEqual([20, 20, 30]);
    expect(r.grains).toBe(70);
  });
  test('오답이면 하트 -1, 연속 0', () => {
    let r = startRound(ten(), T0);
    r = answer(r, '답0', T0);
    r = answer(r, '틀림', r.startedAt);
    expect(r.hearts).toBe(2);
    expect(r.streak).toBe(0);
    expect(r.results[1]).toMatchObject({ correct: false, timedOut: false, grains: 0, userAnswer: '틀림' });
  });
  test('오답·시간 초과 3번이면 판이 끝나고 남은 문제는 결과에 없다', () => {
    let r = startRound(ten(), T0);
    r = answer(r, 'x', T0);
    r = timeout(r, r.startedAt + 20000);
    r = answer(r, 'x', r.startedAt);
    expect(isOver(r)).toBe(true);
    expect(r.results).toHaveLength(3);
    expect(r.results[1].timedOut).toBe(true);
  });
  test('10문제를 다 풀면 끝', () => {
    let r = startRound(ten(), T0);
    for (let i = 0; i < 10; i++) r = answer(r, `답${i}`, r.startedAt);
    expect(isOver(r)).toBe(true);
    expect(r.hearts).toBe(3);
  });
  test('제한 시간이 지난 뒤 들어온 답은 시간 초과(백그라운드 복귀)', () => {
    let r = startRound(ten(), T0);
    r = answer(r, '답0', T0 + 20001);
    expect(r.results[0]).toMatchObject({ correct: false, timedOut: true });
    expect(r.hearts).toBe(2);
  });
  test('다음 문제 시작 시각은 답한 시각', () => {
    let r = startRound(ten(), T0);
    r = answer(r, '답0', T0 + 5000);
    expect(r.startedAt).toBe(T0 + 5000);
    expect(r.results[0].elapsedMs).toBe(5000);
  });
  test('remainingMs는 음수가 아니다', () => {
    const r = startRound(ten(), T0);
    expect(remainingMs(r, T0 + 5000)).toBe(15000);
    expect(remainingMs(r, T0 + 99999)).toBe(0);
  });
});

test('grainsFor: 기본 10 + 빠르기 보너스, 연속 3·5 배수', () => {
  expect(grainsFor(true, 1, 1)).toBe(20);
  expect(grainsFor(true, 0, 1)).toBe(10);
  expect(grainsFor(true, 0.5, 3)).toBe(23);
  expect(grainsFor(true, 1, 5)).toBe(40);
  expect(grainsFor(false, 1, 0)).toBe(0);
});

test('canSubmit: 입력형 빈 답은 받지 않는다', () => {
  expect(canSubmit(typed(1), '  ')).toBe(false);
  expect(canSubmit(typed(1), '답')).toBe(true);
  expect(canSubmit(choice('a'), '')).toBe(true);
});

test('beginQuestion: 해설을 보여 준 뒤 다음 문제의 시작 시각을 다시 잡는다', () => {
  let r = startRound(ten(), T0);
  r = answer(r, '답0', T0 + 1000);
  r = beginQuestion(r, T0 + 2200);
  expect(r.startedAt).toBe(T0 + 2200);
  expect(remainingMs(r, T0 + 2200)).toBe(20000);
});
