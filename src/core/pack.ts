import type { AppPack, AppQuestion } from './types';

export const PACK_BASE_URL = 'https://woorimal-contest.co.kr/app/';
// 이 앱이 읽을 수 있는 묶음 수준. 묶음의 minApp이 이보다 크면 새 앱이 필요한 묶음이라 받지 않는다.
// 웹 저장소 scripts/lib/app-pack.mjs의 APP_PACK_MIN_APP과 맞춘다.
export const APP_PACK_COMPAT = 1;
// 원격 묶음의 문제 수가 지금 묶음의 이 비율 아래로 줄면 배포 실수로 보고 받지 않는다(웹이 shrink: true로 밝히면 예외).
export const MIN_SHRINK_RATIO = 0.5;

const TYPES = new Set(['meaning', 'usage', 'spacing', 'spelling', 'proverb', 'chosung', 'broadcast']);
const SOURCES = new Set(['kbs', 'original', 'blog']);

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

export function parsePack(raw: unknown): AppPack | null {
  const p = raw as any;
  if (!p || p.schema !== 1 || !isStr(p.version) || !isStr(p.generatedAt) || !Array.isArray(p.questions)) return null;
  if (typeof p.minApp === 'number' && p.minApp > APP_PACK_COMPAT) return null;
  if (!p.questions.length || !p.questions.every(validQuestion)) return null;
  if (new Set(p.questions.map((q: AppQuestion) => q.key)).size !== p.questions.length) return null;
  return p as AppPack;
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
