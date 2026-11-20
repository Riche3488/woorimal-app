import type { AppCard, AppCrossword, AppPack, AppQuestion } from './types';

export const PACK_BASE_URL = 'https://woorimal-contest.co.kr/app/';
// 이 앱이 읽을 수 있는 묶음 수준. 묶음의 minApp이 이보다 크면 새 앱이 필요한 묶음이라 받지 않는다.
// 웹 저장소 scripts/lib/app-pack.mjs의 APP_PACK_MIN_APP과 맞춘다.
export const APP_PACK_COMPAT = 1;
// 원격 묶음의 문제 수가 지금 묶음의 이 비율 아래로 줄면 배포 실수로 보고 받지 않는다(웹이 shrink: true로 밝히면 예외).
export const MIN_SHRINK_RATIO = 0.5;

const TYPES = new Set(['meaning', 'usage', 'spacing', 'spelling', 'proverb', 'chosung', 'broadcast']);
const SOURCES = new Set(['kbs', 'original', 'blog', 'adapted']);

const isStr = (v: unknown): v is string => typeof v === 'string';
const isStrList = (v: unknown, min = 1): v is string[] => Array.isArray(v) && v.length >= min && v.every(isStr);

function validQuestion(q: any): q is AppQuestion {
  if (!q || !isStr(q.key) || !isStr(q.answer) || !TYPES.has(q.type) || !SOURCES.has(q.source)) return false;
  switch (q.kind) {
    case 'choice': return isStrList(q.choices, 2) && q.choices.includes(q.answer);
    case 'spacing': return isStrList(q.answers) && isStrList(q.syllables);
    case 'typed': return true;
    default: return false;
  }
}

const CARD_TEXT = ['key', 'word', 'title', 'pos', 'meaning', 'explain', 'tip', 'question'] as const;
const validCard = (c: any): c is AppCard => !!c && CARD_TEXT.every(f => isStr(c[f])) && isStrList(c.examples);

// 퍼즐 판 검사: 판 안에 들어가고, 엇갈리는 칸의 글자가 서로 맞아야 한다.
const LEVELS = new Set(['easy', 'normal', 'hard']);
function validCrossword(b: any): b is AppCrossword {
  const size = (v: unknown) => Number.isInteger(v) && (v as number) >= 4 && (v as number) <= 15;
  if (!b || !isStr(b.id) || !LEVELS.has(b.level) || !isStr(b.theme) || !size(b.rows) || !size(b.cols)) return false;
  if (!Array.isArray(b.entries) || !b.entries.length || !Array.isArray(b.notes) || !isStr(b.intro)) return false;
  const letters = new Map<string, string>();
  for (const e of b.entries) {
    if (!e || (e.dir !== 'across' && e.dir !== 'down') || !Number.isInteger(e.row) || !Number.isInteger(e.col) || !Number.isInteger(e.num)) return false;
    if (!isStr(e.answer) || !/^[가-힣]{2,}$/.test(e.answer) || !isStr(e.clue)) return false;
    const chars = Array.from(e.answer as string);
    for (let i = 0; i < chars.length; i++) {
      const r = e.dir === 'across' ? e.row : e.row + i;
      const c = e.dir === 'across' ? e.col + i : e.col;
      if (r < 0 || c < 0 || r >= b.rows || c >= b.cols) return false;
      const k = `${r},${c}`;
      if (letters.has(k) && letters.get(k) !== chars[i]) return false;
      letters.set(k, chars[i]);
    }
  }
  return true;
}

export function parsePack(raw: unknown): AppPack | null {
  const p = raw as any;
  if (!p || p.schema !== 1 || !isStr(p.version) || !isStr(p.generatedAt) || !Array.isArray(p.questions)) return null;
  if (typeof p.minApp === 'number' && p.minApp > APP_PACK_COMPAT) return null;
  if (!p.questions.length || !p.questions.every(validQuestion)) return null;
  if (new Set(p.questions.map((q: AppQuestion) => q.key)).size !== p.questions.length) return null;
  // 카드·퍼즐은 선택 필드: 잘못된 것만 빼고 묶음은 받는다.
  const out = { ...p };
  if (p.cards !== undefined) out.cards = Array.isArray(p.cards) ? p.cards.filter(validCard) : [];
  if (p.crosswords !== undefined) out.crosswords = Array.isArray(p.crosswords) ? p.crosswords.filter(validCrossword) : [];
  return out as AppPack;
}

// 내려받아 둔 묶음이 내장 묶음보다 오래됐으면(앱 업데이트로 내장이 새로워진 경우) 내장을 쓴다.
export function choosePack(bundled: AppPack, cached: AppPack | null): AppPack {
  return cached && parsePack(cached) && cached.generatedAt >= bundled.generatedAt ? cached : bundled;
}

// 형식 검사를 통과한 원격 묶음을 실제로 쓸지: 지금 것보다 새것이고, 문제 수가 갑자기 크게 줄지 않았을 때만.
export function acceptUpdate(current: AppPack, next: AppPack): boolean {
  if (next.generatedAt <= current.generatedAt) return false;
  if (!next.shrink && next.questions.length < current.questions.length * MIN_SHRINK_RATIO) return false;
  return true;
}
