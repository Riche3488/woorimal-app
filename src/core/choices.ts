// 보기로 풀기: 직접 입력하는 문제(첫소리·뜻·속담)를 보기 4개 고르기로 바꾼다. 묶음 형식은 그대로 두고 출제할 때 바꾼다.
// 오답 보기는 같은 갈래(낱말 문제끼리, 속담끼리)의 다른 정답에서 글자 수·첫소리가 비슷한 것을 먼저 쓴다.
import { getChosung, normalizeAnswer } from './grading';
import type { AppQuestion, QuestionType } from './types';
export const CHOICE_COUNT = 4;
type Rng = () => number;
const FAMILY: Partial<Record<QuestionType, string>> = {
  meaning: 'word',
  chosung: 'word',
  proverb: 'proverb'
};

// 첫소리 문제의 "ㄱㄴㄷ — 뜻" 앞부분을 떼어 뜻풀이만 비교한다.
const meaningOf = (q: AppQuestion) => q.prompt.replace(/^[ㄱ-ㅎ\s]+—\s*/, '').trim();

// Determine presentation without generating 6,000 sets of distractors.
export function choiceAvailability(bank: AppQuestion[]): (q: AppQuestion) => boolean {
  const families = new Map<string, Set<string>>(),
    meanings = new Map<string, Set<string>>();
  for (const q of bank) {
    const family = FAMILY[q.type];
    if (!family) continue;
    const id = normalizeAnswer(q.answer),
      key = `${family}\0${meaningOf(q)}`;
    if (!families.has(family)) families.set(family, new Set());
    families.get(family)!.add(id);
    if (!meanings.has(key)) meanings.set(key, new Set());
    meanings.get(key)!.add(id);
  }
  return q => {
    if (q.kind === 'choice') return true;
    const family = FAMILY[q.type],
      pool = family ? families.get(family) : undefined;
    if (q.kind !== 'typed' || !family || !pool) return false;
    const banned = new Set([normalizeAnswer(q.answer), ...(q.synonyms ?? []).map(normalizeAnswer), ...(meanings.get(`${family}\0${meaningOf(q)}`) ?? [])]);
    return pool.size - [...banned].filter(id => pool.has(id)).length >= CHOICE_COUNT - 1;
  };
}
function shuffle<T>(list: T[], rng: Rng): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
function similarity(answer: string, other: string): number {
  const a = normalizeAnswer(answer);
  const b = normalizeAnswer(other);
  const ca = getChosung(a);
  const cb = getChosung(b);
  let score = 0;
  if (ca === cb) score += 3; // 첫소리 문제는 초성이 같은 낱말이어야 보기 고르기가 의미 있다
  if (Array.from(a).length === Array.from(b).length) score += 2;
  if (ca[0] === cb[0]) score += 1;
  return score;
}
export function asChoice(q: AppQuestion, bank: AppQuestion[], rng: Rng = Math.random): AppQuestion {
  const family = FAMILY[q.type];
  if (q.kind !== 'typed' || !family) return q;
  const own = normalizeAnswer(q.answer);
  const banned = new Set([own, ...(q.synonyms ?? []).map(normalizeAnswer)]);
  const meaning = meaningOf(q);
  // 뜻풀이가 같은 다른 낱말은 그것도 정답이 될 수 있으므로 보기에서 뺀다.
  for (const o of bank) if (FAMILY[o.type] === family && meaningOf(o) === meaning) banned.add(normalizeAnswer(o.answer));
  const seen = new Set<string>();
  const pool: string[] = [];
  for (const o of bank) {
    if (FAMILY[o.type] !== family) continue;
    const id = normalizeAnswer(o.answer);
    if (banned.has(id) || seen.has(id)) continue;
    seen.add(id);
    pool.push(o.answer);
  }
  if (pool.length < CHOICE_COUNT - 1) return q;
  // 섞은 뒤 비슷한 순으로 안정 정렬: 점수가 같은 것끼리는 무작위.
  const scored = shuffle(pool, rng).map(answer => ({
    answer,
    score: similarity(q.answer, answer)
  }));
  scored.sort((x, y) => y.score - x.score);
  const wrong = scored.slice(0, CHOICE_COUNT - 1).map(x => x.answer);
  return {
    ...q,
    kind: 'choice',
    choices: shuffle([q.answer, ...wrong], rng)
  };
}

// 설정 "보기로 풀기"가 켜져 있으면 한 판의 입력형 문제를 모두 보기형으로 바꾼다.
export function withChoiceMode(round: AppQuestion[], bank: AppQuestion[], on: boolean, rng: Rng = Math.random): AppQuestion[] {
  return on ? round.map(q => asChoice(q, bank, rng)) : round;
}
