import { seededRng } from '../challenge';
import { buildGrid, entryCells } from '../crossword';
import { makeCrossword, MAKE_SIZE, puzzlePool } from '../crossword-make';
import { validCrossword } from '../pack';
import type { AppCrossword, AppQuestion } from '../types';

const pack = require('../../../assets/pack.json');
const questions: AppQuestion[] = pack.questions;

// 겹친 칸이 아닌데 옆 칸이 붙으면 엉뚱한 낱말이 생긴다: 가로로 붙은 두 칸은 같은 가로 낱말, 세로도 마찬가지여야 한다.
function noStrayWords(b: AppCrossword) {
  const { cells } = buildGrid(b);
  for (let r = 0; r < b.rows; r++) for (let c = 0; c < b.cols; c++) {
    const g = cells[r][c];
    if (!g) continue;
    const right = cells[r][c + 1];
    if (right) expect(right.across !== undefined && right.across === g.across).toBe(true);
    const below = cells[r + 1]?.[c];
    if (below) expect(below.down !== undefined && below.down === g.down).toBe(true);
  }
}

// 모든 낱말이 엇갈림으로 이어져 한 덩어리여야 한다.
function connected(b: AppCrossword) {
  const { cells } = buildGrid(b);
  const seen = new Set([0]);
  const stack = [0];
  while (stack.length) {
    const i = stack.pop()!;
    for (const [r, c] of entryCells(b.entries[i])) {
      for (const j of [cells[r][c]?.across, cells[r][c]?.down]) {
        if (j !== undefined && !seen.has(j)) { seen.add(j); stack.push(j); }
      }
    }
  }
  expect(seen.size).toBe(b.entries.length);
}

test('puzzlePool: 뜻 문제 중 한글 2~5글자 낱말만, 난이도별로, 같은 낱말은 하나', () => {
  const easy = puzzlePool(questions, 'easy');
  const normal = puzzlePool(questions, 'normal');
  expect(easy.length).toBeGreaterThan(300);
  expect(normal.length).toBeGreaterThan(300);
  for (const w of [...easy, ...normal]) {
    expect(w.answer).toMatch(/^[가-힣]{2,5}$/);
    expect(w.clue.includes(w.answer)).toBe(false);
  }
  expect(new Set(easy.map(w => w.answer)).size).toBe(easy.length);
  const easyKeys = new Set(questions.filter(q => q.easy).map(q => q.key));
  expect(easy.every(w => easyKeys.has(w.key))).toBe(true);
  expect(normal.some(w => easyKeys.has(w.key))).toBe(false);
});

test.each(['easy', 'normal'] as const)('makeCrossword(%s): 묶음 검사를 통과하고, 낱말이 이어지며 엉뚱한 낱말이 없다', level => {
  for (let n = 1; n <= 15; n++) {
    const b = makeCrossword(questions, { level, id: `made-${n}`, num: n, rng: seededRng(`t:${level}:${n}`) });
    expect(b).not.toBeNull();
    const board = b!;
    expect(validCrossword(board)).toBe(true);
    expect(board.rows).toBeLessThanOrEqual(MAKE_SIZE);
    expect(board.cols).toBeLessThanOrEqual(MAKE_SIZE);
    expect(board.entries.length).toBeGreaterThanOrEqual(8);
    expect(new Set(board.entries.map(e => e.answer)).size).toBe(board.entries.length);
    expect(board.level).toBe(level);
    noStrayWords(board);
    connected(board);
  }
});

test('makeCrossword: 힌트는 그 문제의 뜻풀이, 번호는 위→아래·왼→오른 순서', () => {
  const b = makeCrossword(questions, { level: 'easy', id: 'made-1', num: 1, rng: seededRng('clue') })!;
  const byAnswer = new Map(puzzlePool(questions, 'easy').map(w => [w.answer, w.clue]));
  for (const e of b.entries) expect(e.clue).toBe(byAnswer.get(e.answer));
  const starts = [...new Map(b.entries.map(e => [`${e.row},${e.col}`, e])).values()].sort((x, y) => x.row - y.row || x.col - y.col);
  expect(starts.map(e => e.num)).toEqual(starts.map((_, i) => i + 1));
});

test('makeCrossword: 같은 씨앗이면 같은 판, 피할 낱말은 되도록 쓰지 않는다', () => {
  const a = makeCrossword(questions, { level: 'normal', id: 'x', num: 1, rng: seededRng('same') });
  const b = makeCrossword(questions, { level: 'normal', id: 'x', num: 1, rng: seededRng('same') });
  expect(a).toEqual(b);
  const avoid = new Set(a!.entries.map(e => e.answer));
  const c = makeCrossword(questions, { level: 'normal', id: 'y', num: 2, rng: seededRng('same'), avoid })!;
  expect(c.entries.some(e => avoid.has(e.answer))).toBe(false);
});

test('makeCrossword: 낱말이 모자라면 null', () => {
  expect(makeCrossword(questions.slice(0, 3), { level: 'easy', id: 'z', num: 1, rng: seededRng('z') })).toBeNull();
});
