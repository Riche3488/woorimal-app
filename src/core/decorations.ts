// 곳간 장식: 이미 저장된 학습 기록으로 해금한다. 사거나 따로 모으는 재화는 없다.
// 한 번 얻은 장식은 조건이 다시 내려가도(연속 기록이 끊겨도) 남는다.
import { dailyProgress } from './activity';
import { currentStreak, levelFor, localDay } from './growth';
import type { SaveData } from '../data/save';

export type Rarity = 'common' | 'rare' | 'epic';
export const RARITY_LABEL: Record<Rarity, string> = { common: '흔함', rare: '귀함', epic: '아주 귀함' };

type Def = { name: string; condition: string; rarity: Rarity; target: number; metric: (save: SaveData, today: string) => number };

const goalDays = (s: SaveData) => Object.keys(s.activity).filter(day => dailyProgress(s.activity, day).complete).length;
const discovered = (s: SaveData) => Object.keys(s.discoveries).length;
const mastered = (s: SaveData) => Object.values(s.discoveries).filter(w => w.masteredAt !== undefined).length;
const puzzleWords = (s: SaveData) => (s.puzzleWordsRetired ?? 0) + Object.values(s.crosswords).reduce((n, c) => n + new Set(c.solved).size, 0);
// 저장된 streak.days는 다음 갱신 전까지 끊긴 기록도 남아 있어 홈과 같은 '지금 연속'을 쓴다.
const streakNow = (s: SaveData, today: string) => currentStreak(s.streak, today);

export const DECORATIONS = {
  'leaf-flag': { name: '나뭇잎 깃발', condition: '하루 목표 첫 달성', rarity: 'common', target: 1, metric: goalDays },
  'word-sign': { name: '낱말 팻말', condition: '낱말 10개 발견', rarity: 'common', target: 10, metric: discovered },
  scarecrow: { name: '허수아비', condition: '퀴즈 5판 풀기', rarity: 'common', target: 5, metric: s => s.rounds },
  'clay-jars': { name: '장독대', condition: '3일 연속으로 풀기', rarity: 'common', target: 3, metric: streakNow },
  kite: { name: '방패연', condition: '낱말 퍼즐에서 10낱말 맞히기', rarity: 'common', target: 10, metric: puzzleWords },
  'acorn-basket': { name: '도토리 바구니', condition: '간격 복습을 마친 낱말 5개', rarity: 'rare', target: 5, metric: mastered },
  'stone-lantern': { name: '석등', condition: '7일 연속으로 풀기', rarity: 'rare', target: 7, metric: streakNow },
  'persimmon-tree': { name: '감나무', condition: '다람쥐 5레벨', rarity: 'rare', target: 5, metric: s => levelFor(s.totalGrains).level },
  'scholar-desk': { name: '서안과 벼루', condition: '낱말 50개 발견', rarity: 'rare', target: 50, metric: discovered },
  magpie: { name: '까치', condition: '오늘의 문제 7번 풀기', rarity: 'rare', target: 7, metric: s => Object.keys(s.challengeHistory).length },
  watermill: { name: '물레방아', condition: '다람쥐 12레벨', rarity: 'epic', target: 12, metric: s => levelFor(s.totalGrains).level },
  'golden-gourd': { name: '황금 박', condition: '간격 복습을 마친 낱말 30개', rarity: 'epic', target: 30, metric: mastered },
} satisfies Record<string, Def>;

export type DecorationId = keyof typeof DECORATIONS;
export const DECORATION_IDS = Object.keys(DECORATIONS) as DecorationId[];
export const SLOTS = 3;
export type Slots = (DecorationId | null)[];
export type DecorationState = {
  unlocked: DecorationId[];
  equipped: Slots; // 길이 SLOTS. 디오라마 왼쪽·가운데·오른쪽
  seen: DecorationId[]; // 도감에서 확인한 장식. 나머지 해금 장식은 '새로 얻음'
};
export const emptySlots = (): Slots => Array.from({ length: SLOTS }, () => null);

export function decorationProgress(save: SaveData, id: DecorationId, today = localDay(new Date())): { current: number; target: number; done: boolean } {
  const { target, metric } = DECORATIONS[id];
  if (save.decorations.unlocked.includes(id)) return { current: target, target, done: true };
  const current = Math.min(target, Math.max(0, metric(save, today)));
  return { current, target, done: current >= target };
}
export function evaluateUnlocks(save: SaveData, today = localDay(new Date())): DecorationId[] {
  return DECORATION_IDS.filter(id => decorationProgress(save, id, today).done);
}
export function syncDecorations(save: SaveData, today = localDay(new Date())): SaveData {
  const unlocked = evaluateUnlocks(save, today);
  return unlocked.length === save.decorations.unlocked.length ? save : { ...save, decorations: { ...save.decorations, unlocked } };
}
// 원하는 결과를 그대로 적는다(뒤집기가 아니다). 연달아 눌러 같은 요청이 두 번 쌓여도 결과가 같다.
// 잠긴 장식이거나 자리가 꽉 찼으면 그대로 둔다.
export function equipDecoration(save: SaveData, id: DecorationId): SaveData {
  const slots = save.decorations.equipped, free = slots.indexOf(null);
  if (slots.includes(id) || !save.decorations.unlocked.includes(id) || free < 0) return save;
  return { ...save, decorations: { ...save.decorations, equipped: slots.map((v, i) => i === free ? id : v) } };
}
export function unequipDecoration(save: SaveData, id: DecorationId): SaveData {
  const slots = save.decorations.equipped;
  if (!slots.includes(id)) return save;
  return { ...save, decorations: { ...save.decorations, equipped: slots.map(v => v === id ? null : v) } };
}
export function unequipAll(save: SaveData): SaveData {
  return { ...save, decorations: { ...save.decorations, equipped: emptySlots() } };
}
export function newDecorations(save: SaveData): DecorationId[] {
  return save.decorations.unlocked.filter(id => !save.decorations.seen.includes(id));
}
export function markDecorationsSeen(save: SaveData): SaveData {
  return newDecorations(save).length === 0 ? save : { ...save, decorations: { ...save.decorations, seen: [...save.decorations.unlocked] } };
}
