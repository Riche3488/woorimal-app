import { grade } from '../grading';
import { correctInput, wrongInput } from '../testmode';
import type { AppPack, AppQuestion } from '../types';

const pack: AppPack = require('../../../assets/pack.json');

const spacingQ: AppQuestion = {
  key: 'spacing:1', type: 'spacing', kind: 'spacing', prompt: '띄어 쓰세요', answer: '할 수 있다', explain: '',
  syllables: ['할', '수', '있', '다'], answers: ['할 수 있다'], source: 'blog', easy: true,
};

test('띄어쓰기 정답 입력은 정답 문장의 띄어쓰기 자리다', () => {
  expect(correctInput(spacingQ)).toEqual([true, true, false]);
  expect(grade(spacingQ, correctInput(spacingQ)).correct).toBe(true);
  expect(grade(spacingQ, wrongInput(spacingQ)).correct).toBe(false);
});

test('묶음의 모든 문제가 정답 입력으로 맞고 오답 입력으로 틀린다', () => {
  const badRight = pack.questions.filter(q => !grade(q, correctInput(q)).correct).map(q => q.key);
  const badWrong = pack.questions.filter(q => grade(q, wrongInput(q)).correct).map(q => q.key);
  expect(badRight).toEqual([]);
  expect(badWrong).toEqual([]);
});
