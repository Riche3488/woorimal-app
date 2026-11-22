import { dailyProgress } from './activity';
import type { SaveData } from '../data/save';
export const DECORATIONS = {
  'leaf-flag': {
    name: '나뭇잎 깃발',
    condition: '하루 목표 첫 달성'
  },
  'word-sign': {
    name: '낱말 팻말',
    condition: '낱말 10개 발견'
  },
  'acorn-basket': {
    name: '도토리 바구니',
    condition: '간격 복습을 마친 낱말 5개'
  }
} as const;
export type DecorationId = keyof typeof DECORATIONS;
export type DecorationState = {
  unlocked: DecorationId[];
  equipped: DecorationId | null;
};
export function evaluateUnlocks(save: SaveData): DecorationId[] {
  const ids = new Set(save.decorations.unlocked);
  if (Object.keys(save.activity).some(day => dailyProgress(save.activity, day).complete)) ids.add('leaf-flag');
  const words = Object.values(save.discoveries);
  if (words.length >= 10) ids.add('word-sign');
  if (words.filter(w => w.masteredAt !== undefined).length >= 5) ids.add('acorn-basket');
  return Object.keys(DECORATIONS).filter(id => ids.has(id as DecorationId)) as DecorationId[];
}
export function syncDecorations(save: SaveData): SaveData {
  const unlocked = evaluateUnlocks(save);
  return unlocked.length === save.decorations.unlocked.length ? save : {
    ...save,
    decorations: {
      ...save.decorations,
      unlocked
    }
  };
}
export function equipDecoration(save: SaveData, id: DecorationId | null): SaveData {
  return id && !save.decorations.unlocked.includes(id) ? save : {
    ...save,
    decorations: {
      ...save.decorations,
      equipped: id
    }
  };
}
