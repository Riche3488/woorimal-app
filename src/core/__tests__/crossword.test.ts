import {
  boardLetters, buildGrid, CROSSWORD_GRAINS, entryCells, entryPattern, isComplete, revealLetter, solveEntry, emptyCrossword,
} from '../crossword';
import type { AppCrossword } from '../types';

// 운동화(가로, 0행 2열부터) × 운동장(세로, 같은 칸에서) × 장화(가로, 2행 2열부터: 운동장의 '장'에서)
const board: AppCrossword = {
  id: 'cw-023', level: 'easy', theme: '학교', rows: 5, cols: 6, intro: '풀어 보세요', notes: [],
  entries: [
    { num: 1, dir: 'across', row: 0, col: 2, answer: '운동화', clue: '신는 신' },
    { num: 1, dir: 'down', row: 0, col: 2, answer: '운동장', clue: '넓은 마당' },
    { num: 2, dir: 'across', row: 2, col: 2, answer: '장화', clue: '목이 긴 신' },
  ],
};

test('entryCells·buildGrid: 칸 좌표와 번호, 칸마다 가로·세로 낱말', () => {
  expect(entryCells(board.entries[1])).toEqual([[0, 2], [1, 2], [2, 2]]);
  const g = buildGrid(board);
  expect(g.cells[0][2]).toEqual({ answer: '운', across: 0, down: 1, num: 1 });
  expect(g.cells[2][3]).toEqual({ answer: '화', across: 2 });
  expect(g.cells[1][3]).toBeNull();
});

test('solveEntry: 맞으면 그 낱말을 풀고 낱알을 준다. 틀리거나 이미 푼 낱말은 그대로', () => {
  const p0 = emptyCrossword();
  const wrong = solveEntry(board, p0, 0, '운동장');
  expect(wrong).toEqual({ progress: p0, correct: false, grains: 0 });
  const right = solveEntry(board, p0, 0, ' 운 동화 ');
  expect(right.correct).toBe(true);
  expect(right.grains).toBe(CROSSWORD_GRAINS);
  expect(right.progress.solved).toEqual([0]);
  expect(solveEntry(board, right.progress, 0, '운동화').grains).toBe(0);
});

test('boardLetters·entryPattern: 푼 낱말과 보여 준 글자가 판에 채워지고, 엇갈리는 낱말의 칸은 힌트가 된다', () => {
  const p = solveEntry(board, emptyCrossword(), 1, '운동장').progress;
  const letters = boardLetters(board, p);
  expect(letters).toEqual({ '0,2': '운', '1,2': '동', '2,2': '장' });
  expect(entryPattern(board, 0, letters)).toBe('운○○');
  expect(entryPattern(board, 2, letters)).toBe('장○');
});

test('revealLetter: 빈 칸 하나를 보여 주고 도움 수를 센다. 모두 차면 그 낱말을 푼 것으로', () => {
  let p = revealLetter(board, emptyCrossword(), 2);
  expect(p.revealed).toEqual({ '2,2': '장' });
  expect(p.helps).toBe(1);
  p = revealLetter(board, p, 2);
  expect(p.solved).toEqual([2]);
  expect(revealLetter(board, p, 2)).toBe(p);
});

test('isComplete: 모든 낱말을 풀면 끝', () => {
  let p = emptyCrossword();
  for (const [i, a] of [[0, '운동화'], [1, '운동장']] as const) p = solveEntry(board, p, i, a).progress;
  expect(isComplete(board, p)).toBe(false);
  p = solveEntry(board, p, 2, '장화').progress;
  expect(isComplete(board, p)).toBe(true);
});
