// 가로세로 퍼즐(휴대폰용): 칸을 하나씩 채우는 대신 낱말 하나를 통째로 입력해 푼다.
// 판 데이터는 웹 data/crosswords(공개 허용분)를 묶음 crosswords로 받는다. 칸 규칙은 웹 public/scripts/lib/crossword.mjs와 같다.
import { normalizeAnswer } from './grading';
import type { AppCrossword, CrosswordEntry } from './types';

export const CROSSWORD_LEVELS = { easy: '쉬움', normal: '보통', hard: '어려움' } as const;
export const CROSSWORD_GRAINS = 5; // 낱말 하나를 직접 맞히면 받는 낱알(글자 보기로 채운 낱말은 0)

export type CrosswordProgress = { solved: number[]; revealed: Record<string, string>; helps: number };
export type GridCell = { answer: string; across?: number; down?: number; num?: number };

export const emptyCrossword = (): CrosswordProgress => ({ solved: [], revealed: {}, helps: 0 });
export const cellKey = (r: number, c: number) => `${r},${c}`;

export function entryCells(e: CrosswordEntry): [number, number][] {
  return Array.from(e.answer).map((_, i) => (e.dir === 'across' ? [e.row, e.col + i] : [e.row + i, e.col]));
}

export function buildGrid(board: AppCrossword): { rows: number; cols: number; cells: (GridCell | null)[][] } {
  const cells: (GridCell | null)[][] = Array.from({ length: board.rows }, () => Array(board.cols).fill(null));
  board.entries.forEach((e, index) => {
    const letters = Array.from(e.answer);
    entryCells(e).forEach(([r, c], i) => {
      if (r < 0 || c < 0 || r >= board.rows || c >= board.cols) return;
      const cell = (cells[r][c] ??= { answer: letters[i] });
      cell[e.dir] = index;
      if (i === 0) cell.num = e.num;
    });
  });
  return { rows: board.rows, cols: board.cols, cells };
}

// 판에 채워진 글자: 푼 낱말의 글자 + 글자 보기로 보여 준 글자.
export function boardLetters(board: AppCrossword, p: CrosswordProgress): Record<string, string> {
  const out: Record<string, string> = { ...p.revealed };
  for (const i of p.solved) {
    const e = board.entries[i];
    if (!e) continue;
    const letters = Array.from(e.answer);
    entryCells(e).forEach(([r, c], k) => { out[cellKey(r, c)] = letters[k]; });
  }
  return out;
}

// 입력할 때 보여 줄 모양: 이미 채워진 칸은 글자, 빈칸은 ○.
export function entryPattern(board: AppCrossword, index: number, letters: Record<string, string>): string {
  return entryCells(board.entries[index]).map(([r, c]) => letters[cellKey(r, c)] ?? '○').join('');
}

// 엇갈리는 낱말들로 칸이 다 찬 낱말은 푼 것으로 친다(낱알 없음).
function settle(board: AppCrossword, p: CrosswordProgress): CrosswordProgress {
  const letters = boardLetters(board, p);
  const solved = new Set(p.solved);
  board.entries.forEach((e, i) => {
    if (!solved.has(i) && entryCells(e).every(([r, c]) => letters[cellKey(r, c)])) solved.add(i);
  });
  return solved.size === p.solved.length ? p : { ...p, solved: [...solved].sort((a, b) => a - b) };
}

export function solveEntry(board: AppCrossword, p: CrosswordProgress, index: number, input: string) {
  const e = board.entries[index];
  // 이미 푼 낱말은 다시 낱알을 주지 않는다.
  if (!e || p.solved.includes(index) || normalizeAnswer(input) !== normalizeAnswer(e.answer)) return { progress: p, correct: false, grains: 0 };
  return { progress: settle(board, { ...p, solved: [...p.solved, index] }), correct: true, grains: CROSSWORD_GRAINS };
}

// 글자 보기: 그 낱말의 빈칸 하나(앞에서부터)를 보여 준다.
export function revealLetter(board: AppCrossword, p: CrosswordProgress, index: number): CrosswordProgress {
  const e = board.entries[index];
  if (!e || p.solved.includes(index)) return p;
  const letters = boardLetters(board, p);
  const answer = Array.from(e.answer);
  const k = entryCells(e).findIndex(([r, c]) => !letters[cellKey(r, c)]);
  if (k < 0) return settle(board, p);
  const [r, c] = entryCells(e)[k];
  return settle(board, { ...p, revealed: { ...p.revealed, [cellKey(r, c)]: answer[k] }, helps: p.helps + 1 });
}

export const isComplete = (board: AppCrossword, p: CrosswordProgress) => board.entries.every((_, i) => p.solved.includes(i));
