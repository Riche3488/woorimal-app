import { CHALLENGE_SIZE, challengeNumber, marksFor, pickChallenge, shareText } from '../challenge';
import type { AppQuestion, QuestionType } from '../types';
import type { RoundResult } from '../round';

const TYPES: QuestionType[] = ['meaning', 'spelling', 'spacing', 'proverb', 'chosung', 'usage'];
const bank: AppQuestion[] = TYPES.flatMap(type => Array.from({ length: 30 }, (_, i) => ({
  key: `${type}:${i}`, type, kind: 'choice' as const, prompt: `${type} ${i}`, answer: 'a', explain: '',
  choices: ['a', 'b', 'c', 'd'], source: 'original' as const, easy: i < 5,
})));

describe('오늘의 문제 출제', () => {
  test('같은 날이면 묶음 순서가 달라도 같은 문제·같은 보기 순서', () => {
    const a = pickChallenge(bank, '2026-11-19');
    const b = pickChallenge([...bank].reverse(), '2026-11-19');
    expect(a).toEqual(b);
    expect(a).toHaveLength(CHALLENGE_SIZE);
  });
  test('날짜가 바뀌면 다른 문제', () => {
    const keys = (d: string) => pickChallenge(bank, d).map(q => q.key).join();
    expect(keys('2026-11-19')).not.toBe(keys('2026-11-20'));
  });
  test('유형이 겹치지 않는다', () => {
    for (const d of ['2026-11-19', '2026-12-01', '2027-03-15']) {
      const types = pickChallenge(bank, d).map(q => q.type);
      expect(new Set(types).size).toBe(CHALLENGE_SIZE);
    }
  });
  test('유형이 적으면 돌아가며 채운다', () => {
    const two = bank.filter(q => q.type === 'meaning' || q.type === 'spelling');
    const picked = pickChallenge(two, '2026-11-19');
    expect(picked).toHaveLength(CHALLENGE_SIZE);
    expect(new Set(picked.map(q => q.key)).size).toBe(CHALLENGE_SIZE);
  });
  test('보기를 섞되 원본은 건드리지 않는다', () => {
    const picked = pickChallenge(bank, '2026-11-19');
    expect(picked.some(q => q.choices!.join() !== 'a,b,c,d')).toBe(true);
    expect(bank.every(q => q.choices!.join() === 'a,b,c,d')).toBe(true);
  });
});

test('회차 번호: 2026-11-19가 1회', () => {
  expect(challengeNumber('2026-11-19')).toBe(1);
  expect(challengeNumber('2026-11-20')).toBe(2);
  expect(challengeNumber('2027-01-01')).toBe(44);
});

const r = (correct: boolean, timedOut = false) => ({ correct, timedOut } as RoundResult);

test('marksFor: 맞힘 o, 틀림 x, 시간 초과 t', () => {
  expect(marksFor([r(true), r(false), r(false, true)])).toBe('oxt');
});

test('공유 글', () => {
  expect(shareText({ day: '2026-11-19', marks: 'ooxot', streak: 4 })).toBe(
    '우리말 곳간 오늘의 문제 #1\n🟩🟩🟥🟩⏰ 3/5\n🔥 4일 연속\nhttps://woorimal-contest.co.kr',
  );
  expect(shareText({ day: '2026-11-20', marks: 'ooooo', streak: 0 })).toBe(
    '우리말 곳간 오늘의 문제 #2\n🟩🟩🟩🟩🟩 5/5\nhttps://woorimal-contest.co.kr',
  );
});
