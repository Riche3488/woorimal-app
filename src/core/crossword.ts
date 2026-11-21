// 가로세로 퍼즐(휴대폰용): 칸을 하나씩 채우는 대신 낱말 하나를 통째로 입력해 푼다.
// 판 데이터는 웹 data/crosswords(공개 허용분)를 묶음 crosswords로 받는다. 칸 규칙은 웹 public/scripts/lib/crossword.mjs와 같다.
import { getChosung, normalizeAnswer } from './grading';
import type { AppCrossword, CrosswordEntry } from './types';

export const CROSSWORD_LEVELS = { easy: '쉬움', normal: '보통', hard: '어려움' } as const;
export const CROSSWORD_GRAINS = 5; // 낱말 하나를 직접 맞히면 받는 낱알(엇갈리는 낱말로 저절로 찬 낱말은 0)
export const CROSSWORD_HINT_GRAINS = 3; // 초성 보기 찬스를 쓰고 맞힌 낱말의 낱알

// chosung: 초성을 보여 준 낱말 번호(entries의 순서). 예전 저장에는 없으므로 선택 필드.
// revealed: 예전 '글자 보기'로 연 칸(기능은 없앴고, 이미 연 칸은 그대로 보여 준다).
export type CrosswordProgress = { solved: number[]; revealed: Record<string, string>; helps: number; chosung?: number[] };
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

// 판에 채워진 글자: 푼 낱말의 글자 + 예전 글자 보기로 연 글자.
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

// 입력할 때 보여 줄 모양: 이미 채워진 칸은 글자, 빈칸은 ○(초성을 본 낱말이면 초성).
export function entryPattern(board: AppCrossword, index: number, letters: Record<string, string>, p?: CrosswordProgress): string {
  const e = board.entries[index];
  const hint = p?.chosung?.includes(index) ? getChosung(e.answer) : null;
  return entryCells(e).map(([r, c], i) => letters[cellKey(r, c)] ?? (hint ? hint[i] : '○')).join('');
}

// 판에 흐리게 보여 줄 초성: 초성을 본 낱말 중 아직 안 푼 낱말의 빈칸.
export function boardChosung(board: AppCrossword, p: CrosswordProgress): Record<string, string> {
  const letters = boardLetters(board, p);
  const out: Record<string, string> = {};
  for (const i of p.chosung ?? []) {
    const e = board.entries[i];
    if (!e || p.solved.includes(i)) continue;
    const hint = getChosung(e.answer);
    entryCells(e).forEach(([r, c], k) => { if (!letters[cellKey(r, c)]) out[cellKey(r, c)] = hint[k]; });
  }
  return out;
}

// 초성 보기 찬스(save.chance): 하루 한 번 몫(모든 판 통틀어) + 판을 다 풀 때마다 하나씩 모으는 덤(최대 CHANCE_BONUS_MAX개).
// day: 오늘 몫을 쓴 날, bonus: 모아 둔 덤 찬스 수. 쓸 때는 오늘 몫부터 쓴다.
export type ChanceState = { day: string | null; bonus: number };
export const chanceCount = (c: ChanceState, today: string) => (c.day !== today ? 1 : 0) + c.bonus;
export function spendChance(c: ChanceState, today: string): ChanceState {
  if (c.day !== today) return { ...c, day: today };
  return c.bonus > 0 ? { ...c, bonus: c.bonus - 1 } : c;
}
export const CHANCE_BONUS_MAX = 3; // 덤 찬스는 이만큼만 모인다
export const earnChance = (c: ChanceState): ChanceState => (c.bonus >= CHANCE_BONUS_MAX ? c : { ...c, bonus: c.bonus + 1 });

// 초성 보기: 그 낱말의 모든 글자 초성을 보여 준다(도움 1번). 맞히면 낱알이 줄어든다. 찬스 수 제한은 화면이 chanceCount로 건다.
export function showChosung(board: AppCrossword, p: CrosswordProgress, index: number): CrosswordProgress {
  if (!board.entries[index] || p.solved.includes(index) || p.chosung?.includes(index)) return p;
  return { ...p, chosung: [...(p.chosung ?? []), index], helps: p.helps + 1 };
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
  const grains = p.chosung?.includes(index) ? CROSSWORD_HINT_GRAINS : CROSSWORD_GRAINS;
  return { progress: settle(board, { ...p, solved: [...p.solved, index] }), correct: true, grains };
}

export const isComplete = (board: AppCrossword, p: CrosswordProgress) => board.entries.every((_, i) => p.solved.includes(i));
