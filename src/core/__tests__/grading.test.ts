import { grade, gradeTyped, getChosung, normalizeAnswer, spacingGaps, gradeSpacing, acceptedAnswers } from '../grading';
import type { AppQuestion } from '../types';

const typedQ = (answer: string, synonyms: string[] = []): AppQuestion => ({
  key: `meaning:${answer}`, type: 'meaning', kind: 'typed', prompt: '뜻', answer, explain: '', synonyms, source: 'original', easy: true,
});
const broadcastTyped = (answer: string): AppQuestion => ({
  key: `broadcast:${answer}`, type: 'broadcast', kind: 'typed', prompt: '문제', answer, explain: '', source: 'kbs', easy: false,
});
const spacingQ = (answers: string[]): AppQuestion => ({
  key: 'spacing:1', type: 'spacing', kind: 'spacing', prompt: '띄어야 할 곳을 눌러 주세요', answer: answers[0], explain: '',
  answers, syllables: spacingGaps(answers[0]).syllables, source: 'blog', easy: true,
});
const choiceQ: AppQuestion = {
  key: 'spelling:1', type: 'spelling', kind: 'choice', prompt: '___는 내가 할게.', answer: '설거지', explain: '',
  choices: ['설겆이', '설거지'], source: 'original', easy: true,
};

describe('입력형 채점', () => {
  test('끝 공백과 조합형(NFD) 입력도 정답으로 본다', () => {
    expect(grade(typedQ('포옹'), '포옹 ').correct).toBe(true);
    expect(grade(typedQ('포옹'), '포옹'.normalize('NFD')).correct).toBe(true);
  });
  test('빈 입력은 오답', () => {
    expect(grade(typedQ('포옹'), '').correct).toBe(false);
    expect(grade(broadcastTyped('포옹'), '   ').correct).toBe(false);
  });
  test('동의어는 오답이지만 synonymHit로 알린다', () => {
    expect(gradeTyped('보듬다', '껴안다', ['보듬다'])).toEqual({ correct: false, synonymHit: true });
    expect(grade(typedQ('껴안다', ['보듬다']), '보듬다')).toEqual({ correct: false, synonymHit: true });
  });
});

describe('방송 문제 정답 표기', () => {
  test('원문자 번호 정답은 번호·숫자·낱말 모두 받는다', () => {
    const q = broadcastTyped('②도량');
    expect(grade(q, '2').correct).toBe(true);
    expect(grade(q, '②').correct).toBe(true);
    expect(grade(q, '도량').correct).toBe(true);
    expect(grade(q, '3').correct).toBe(false);
  });
  test('화살표 표기는 고친 말도 받는다', () => {
    expect(grade(broadcastTyped('오똑하다 -> 오뚝하다'), '오뚝하다').correct).toBe(true);
  });
  test('쉼표로 나열한 여러 정답은 순서 무관하게 모두 맞혀야 한다', () => {
    const q = broadcastTyped('이목구비, 안색');
    expect(grade(q, '안색, 이목구비').correct).toBe(true);
    expect(grade(q, '안색').correct).toBe(false);
  });
  test('괄호 속 한자는 빼고도 받는다', () => {
    expect(acceptedAnswers('간(肝)')).toContain('간');
  });
});

describe('띄어쓰기·보기형', () => {
  test('띄운 자리가 정답과 같으면 정답', () => {
    const q = spacingQ(['할 수밖에 없다']);
    expect(grade(q, spacingGaps('할 수밖에 없다').gaps).correct).toBe(true);
    expect(grade(q, spacingGaps('할수 밖에 없다').gaps).correct).toBe(false);
  });
  test('gradeSpacing은 길이가 다르면 오답', () => {
    expect(gradeSpacing([true], ['할 수밖에 없다'])).toBe(false);
  });
  test('보기형은 고른 보기가 정답과 같아야 한다', () => {
    expect(grade(choiceQ, '설거지').correct).toBe(true);
    expect(grade(choiceQ, '설겆이').correct).toBe(false);
  });
});

test('getChosung·normalizeAnswer', () => {
  expect(getChosung('포옹 a')).toBe('ㅍㅇ a');
  expect(normalizeAnswer(' 할 수 ')).toBe('할수');
});
