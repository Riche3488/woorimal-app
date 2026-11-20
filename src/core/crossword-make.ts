// 조합 퍼즐: 묶음의 뜻 문제(뜻풀이 → 낱말)를 엮어 가로세로 판을 새로 만든다.
// 문제 내용은 바꾸지 않고 낱말과 뜻풀이만 가져온다. 만든 판은 저장 데이터에 통째로 남겨, 묶음이 바뀌어도 진행이 깨지지 않게 한다.
import type { AppCrossword, AppQuestion, CrosswordEntry } from './types';

export const MAKE_SIZE = 9; // 판 크기 한도(가로·세로 칸 수). 휴대폰 화면에 칸이 너무 작아지지 않게.
const TARGET = 12; // 이만큼 낱말을 놓으면 멈춘다
const MIN_WORDS = 8; // 이보다 적게 놓이면 판을 만들지 못한 것으로 본다
const ATTEMPTS = 6;

export type MadeLevel = 'easy' | 'normal';
export type PoolWord = { key: string; answer: string; clue: string };
type Dir = 'across' | 'down';
type Cell = { ch: string; across?: true; down?: true };

// 쓸 수 있는 낱말: 뜻 문제 중 한글 2~5글자, 뜻풀이에 답이 드러나지 않는 것. 쉬움은 easy 문제, 보통은 나머지.
export function puzzlePool(questions: AppQuestion[], level: MadeLevel): PoolWord[] {
  const seen = new Set<string>();
  const out: PoolWord[] = [];
  for (const q of questions) {
    if (q.type !== 'meaning' || !/^[가-힣]{2,5}$/.test(q.answer) || q.prompt.includes(q.answer)) continue;
    if ((level === 'easy') !== q.easy || seen.has(q.answer)) continue;
    seen.add(q.answer);
    out.push({ key: q.key, answer: q.answer, clue: q.prompt });
  }
  return out;
}

function shuffle<T>(list: T[], rng: () => number): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

type Opts = { level: MadeLevel; id: string; num: number; rng: () => number; avoid?: Set<string> };

// 첫 낱말을 가로로 놓고, 놓인 글자와 엇갈리게 낱말을 하나씩 더한다.
// 새 칸은 옆(낱말과 수직 방향)이 비어 있어야 하고, 낱말 앞뒤 칸도 비어 있어야 한다: 판에 엉뚱한 낱말이 생기지 않는다.
// 첫 낱말에 따라 막힐 수 있으므로 첫 낱말을 바꿔 몇 번 다시 해 보고 가장 많이 놓인 판을 쓴다.
export function makeCrossword(questions: AppQuestion[], { level, id, num, rng, avoid = new Set() }: Opts): AppCrossword | null {
  const pool = puzzlePool(questions, level);
  let best: AppCrossword | null = null;
  for (let tries = 0; tries < ATTEMPTS && (best?.entries.length ?? 0) < TARGET; tries++) {
    const b = attempt(pool, { level, id, num, rng, avoid });
    if (b && b.entries.length > (best?.entries.length ?? 0)) best = b;
  }
  return best;
}

function attempt(pool: PoolWord[], { level, id, num, rng, avoid = new Set() }: Opts): AppCrossword | null {
  const order = [...shuffle(pool.filter(w => !avoid.has(w.answer)), rng), ...shuffle(pool.filter(w => avoid.has(w.answer)), rng)];
  const bySyllable = new Map<string, PoolWord[]>();
  for (const w of order) for (const ch of new Set(w.answer)) {
    const list = bySyllable.get(ch);
    if (list) list.push(w); else bySyllable.set(ch, [w]);
  }

  const cells = new Map<string, Cell>();
  const at = (r: number, c: number) => cells.get(`${r},${c}`);
  const placed: (PoolWord & { dir: Dir; row: number; col: number })[] = [];
  const used = new Set<string>();
  let box = { r0: 0, r1: 0, c0: 0, c1: 0 };

  // 놓을 수 있으면 엇갈리는 칸 수, 못 놓으면 -1.
  const fit = (word: string, dir: Dir, row: number, col: number): number => {
    const chars = Array.from(word);
    const [dr, dc] = dir === 'across' ? [0, 1] : [1, 0];
    const endR = row + dr * (chars.length - 1);
    const endC = col + dc * (chars.length - 1);
    if (Math.max(box.r1, endR) - Math.min(box.r0, row) + 1 > MAKE_SIZE) return -1;
    if (Math.max(box.c1, endC) - Math.min(box.c0, col) + 1 > MAKE_SIZE) return -1;
    if (at(row - dr, col - dc) || at(endR + dr, endC + dc)) return -1;
    let cross = 0;
    for (let i = 0; i < chars.length; i++) {
      const r = row + dr * i;
      const c = col + dc * i;
      const cell = at(r, c);
      if (cell) {
        if (cell.ch !== chars[i] || cell[dir]) return -1;
        cross++;
      } else if (at(r + dc, c + dr) || at(r - dc, c - dr)) return -1;
    }
    return cross;
  };
  const put = (w: PoolWord, dir: Dir, row: number, col: number) => {
    Array.from(w.answer).forEach((ch, i) => {
      const r = dir === 'across' ? row : row + i;
      const c = dir === 'across' ? col + i : col;
      const k = `${r},${c}`;
      const cell = cells.get(k) ?? { ch };
      cell[dir] = true;
      cells.set(k, cell);
      box = { r0: Math.min(box.r0, r), r1: Math.max(box.r1, r), c0: Math.min(box.c0, c), c1: Math.max(box.c1, c) };
    });
    placed.push({ ...w, dir, row, col });
    used.add(w.answer);
  };

  const first = order.find(w => w.answer.length >= 3 && w.answer.length <= 4);
  if (!first) return null;
  put(first, 'across', 0, 0);

  while (placed.length < TARGET) {
    let best: { w: PoolWord; dir: Dir; row: number; col: number; score: number } | null = null;
    for (const [k, cell] of shuffle([...cells.entries()], rng)) {
      if (cell.across && cell.down) continue;
      const dir: Dir = cell.across ? 'down' : 'across';
      const [r, c] = k.split(',').map(Number);
      for (const w of bySyllable.get(cell.ch) ?? []) {
        if (used.has(w.answer)) continue;
        Array.from(w.answer).forEach((ch, i) => {
          if (ch !== cell.ch) return;
          const row = dir === 'down' ? r - i : r;
          const col = dir === 'across' ? c - i : c;
          const cross = fit(w.answer, dir, row, col);
          if (cross < 1) return;
          // 처음 보는 낱말 > 많이 엇갈리는 자리 > 긴 낱말, 같으면 무작위.
          const score = (avoid.has(w.answer) ? 0 : 100) + cross * 10 + w.answer.length + rng();
          if (!best || score > best.score) best = { w, dir, row, col, score };
        });
      }
    }
    if (!best) break;
    const { w, dir, row, col } = best;
    put(w, dir, row, col);
  }
  if (placed.length < MIN_WORDS) return null;

  // 왼쪽 위를 0,0으로 옮기고, 시작 칸을 위→아래·왼→오른 순서로 번호 매긴다.
  const nums = new Map<string, number>();
  [...new Set(placed.map(p => `${p.row - box.r0},${p.col - box.c0}`))]
    .map(k => k.split(',').map(Number))
    .sort((a, b) => a[0] - b[0] || a[1] - b[1])
    .forEach(([r, c], i) => nums.set(`${r},${c}`, i + 1));
  const entries: CrosswordEntry[] = placed.map(p => {
    const row = p.row - box.r0;
    const col = p.col - box.c0;
    return { num: nums.get(`${row},${col}`)!, dir: p.dir, row, col, answer: p.answer, clue: p.clue };
  }).sort((a, b) => a.num - b.num || (a.dir === 'across' ? -1 : 1));

  return {
    id, level, theme: `조합 퍼즐 ${num}`,
    rows: Math.max(4, box.r1 - box.r0 + 1), cols: Math.max(4, box.c1 - box.c0 + 1),
    entries, intro: '여러 문제의 낱말을 엮어 만든 판이에요. 다시 보고 싶은 낱말은 뜻풀이와 함께 한 번 더 읽어 보세요.', notes: [],
  };
}
