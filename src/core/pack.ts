import type { AppPack, AppQuestion } from './types';

export const PACK_BASE_URL = 'https://woorimal-contest.co.kr/app/';

const isStr = (v: unknown): v is string => typeof v === 'string';
const isStrList = (v: unknown, min = 1): v is string[] => Array.isArray(v) && v.length >= min && v.every(isStr);

function validQuestion(q: any): q is AppQuestion {
  if (!q || !isStr(q.key) || !isStr(q.type) || !isStr(q.answer) || !isStr(q.source)) return false;
  switch (q.kind) {
    case 'choice': return isStrList(q.choices, 2) && q.choices.includes(q.answer);
    case 'spacing': return isStrList(q.answers) && isStrList(q.syllables);
    case 'typed': return true;
    default: return false;
  }
}

export function parsePack(raw: unknown): AppPack | null {
  const p = raw as any;
  if (!p || p.schema !== 1 || !isStr(p.version) || !Array.isArray(p.questions)) return null;
  if (!p.questions.length || !p.questions.every(validQuestion)) return null;
  return p as AppPack;
}

export function choosePack(bundled: AppPack, cached: AppPack | null): AppPack {
  return cached && parsePack(cached) ? cached : bundled;
}
