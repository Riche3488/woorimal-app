import { asChoice, CHOICE_COUNT, withChoiceMode } from '../choices';
import { gradeItem } from '../grading';
import type { AppQuestion, QuestionType } from '../types';

const typed = (key: string, type: QuestionType, answer: string, prompt = `${answer}의 뜻`): AppQuestion => ({
  key, type, kind: 'typed', prompt, answer, explain: '', source: 'original', easy: true,
});
const seeded = (seed = 1) => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

const bank: AppQuestion[] = [
  typed('meaning:1', 'meaning', '가늘다'),
  typed('chosung:1', 'chosung', '가늘다', 'ㄱㄴㄷ — 가늘다의 뜻'),
  typed('meaning:2', 'meaning', '가렵다'),
  typed('meaning:3', 'meaning', '고요하다'),
  typed('meaning:4', 'meaning', '나무'),
  typed('meaning:5', 'meaning', '구슬프다'),
  typed('meaning:6', 'meaning', '같은뜻', '가늘다의 뜻'), // 뜻풀이가 같은 낱말은 보기에 넣지 않는다
  typed('proverb:1', 'proverb', '고와야', '가는 말이 ○○○ 오는 말이 곱다'),
  typed('proverb:2', 'proverb', '빈대', '○○ 잡으려다 초가삼간 태운다'),
  typed('proverb:3', 'proverb', '세 살', '○○ 버릇 여든까지 간다'),
  typed('proverb:4', 'proverb', '등잔', '○○ 밑이 어둡다'),
  { key: 'spelling:1', type: 'spelling', kind: 'choice', prompt: '바르게 쓴 것은?', answer: '설거지', choices: ['설거지', '설겆이'], explain: '', source: 'original', easy: true },
];

describe('asChoice: 입력형을 보기 고르기로', () => {
  test('보기 4개, 정답 하나, 같은 낱말·같은 뜻풀이 낱말은 보기에 없다', () => {
    for (let s = 1; s < 20; s++) {
      const q = asChoice(bank[0], bank, seeded(s));
      expect(q.kind).toBe('choice');
      expect(q.choices).toHaveLength(CHOICE_COUNT);
      expect(q.choices!.filter(c => c === '가늘다')).toHaveLength(1);
      expect(q.choices).not.toContain('같은뜻');
      expect(new Set(q.choices).size).toBe(CHOICE_COUNT);
      expect(gradeItem(q, '가늘다')).toBe(true);
      expect(gradeItem(q, q.choices!.find(c => c !== '가늘다')!)).toBe(false);
    }
  });
  test('글자 수·첫소리가 비슷한 낱말을 먼저 보기로 쓴다', () => {
    // 가렵다(3글자·ㄱ) > 고요하다·구슬프다(ㄱ) > 나무(2글자·ㄴ)
    for (let s = 1; s < 10; s++) {
      expect([...asChoice(bank[0], bank, seeded(s)).choices!].sort()).toEqual(['가늘다', '가렵다', '고요하다', '구슬프다'].sort());
    }
  });
  test('속담은 속담 빈칸 낱말끼리', () => {
    const q = asChoice(bank[7], bank, seeded());
    expect([...q.choices!].sort()).toEqual(['고와야', '등잔', '빈대', '세 살'].sort());
  });
  test('보기를 만들 낱말이 모자라거나 보기형이면 그대로', () => {
    expect(asChoice(bank[7], bank.slice(7, 9), seeded())).toEqual(bank[7]);
    expect(asChoice(bank[11], bank, seeded())).toBe(bank[11]);
  });
  test('원본은 바꾸지 않는다', () => {
    const before = JSON.stringify(bank);
    asChoice(bank[0], bank, seeded());
    expect(JSON.stringify(bank)).toBe(before);
  });
});

test('withChoiceMode: 켜면 한 판의 입력형 문제를 모두 바꾸고, 끄면 그대로', () => {
  const round = [bank[0], bank[7], bank[11]];
  expect(withChoiceMode(round, bank, false)).toBe(round);
  const on = withChoiceMode(round, bank, true, seeded());
  expect(on.map(q => q.kind)).toEqual(['choice', 'choice', 'choice']);
  expect(on[2]).toBe(bank[11]);
});

test('내장 묶음: 입력형 문제는 모두 보기 4개(서로 다르고 정답 하나)로 바뀌고 정답으로 맞는다', () => {
  const pack: { questions: AppQuestion[] } = require('../../../assets/pack.json');
  const typedQs = pack.questions.filter(x => x.kind === 'typed');
  const rng = seeded(7);
  const bad = typedQs.filter(x => {
    const c = asChoice(x, pack.questions, rng);
    const norm = c.choices?.map(s => s.replace(/\s/g, '')) ?? [];
    return c.kind !== 'choice' || new Set(norm).size !== CHOICE_COUNT
      || norm.filter(s => s === x.answer.replace(/\s/g, '')).length !== 1 || !gradeItem(c, x.answer);
  }).map(x => x.key);
  expect(bad).toEqual([]);
});
