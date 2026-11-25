// 저장을 여러 키로 나눈다. Android AsyncStorage는 한 값을 약 2MB(CursorWindow)까지만 읽을 수 있어서,
// 문제 수만큼 늘어나는 문제 기록(progress.stats)과 낱말 도감(discoveries)을 키 이름으로 조각에 나눠 담는다.
// 본 키(SAVE_KEY)에는 나머지와 parts(조각 수)를 두고, 조각 키는 `${SAVE_KEY}.part.<번호>`.
import type { SaveData } from './save';

export const PART_COUNT = 16;
const BASE_KEY = 'woorimal.save.v1';
export const partKey = (i: number) => `${BASE_KEY}.part.${i}`;
export const PART_KEYS = Array.from({ length: PART_COUNT }, (_, i) => partKey(i));

type Stats = SaveData['progress']['stats'];
type Discoveries = SaveData['discoveries'];
export type SavePart = { s: Stats; d: Discoveries };

// 같은 키는 늘 같은 조각에 간다(기기·실행이 달라도).
export function partOf(key: string): number {
  let h = 5381;
  for (let i = 0; i < key.length; i++) h = (h * 33 + key.charCodeAt(i)) >>> 0;
  return h % PART_COUNT;
}

export function splitParts(save: SaveData): SavePart[] {
  const parts: SavePart[] = Array.from({ length: PART_COUNT }, () => ({ s: {}, d: {} }));
  for (const [k, v] of Object.entries(save.progress.stats)) parts[partOf(k)].s[k] = v;
  for (const [k, v] of Object.entries(save.discoveries)) parts[partOf(k)].d[k] = v;
  return parts;
}

export function mainText(save: SaveData): string {
  return JSON.stringify({ ...save, progress: { ...save.progress, stats: {} }, discoveries: {}, parts: PART_COUNT });
}

export function splitSave(save: SaveData): { main: string; parts: string[] } {
  return { main: mainText(save), parts: splitParts(save).map(p => JSON.stringify(p)) };
}

// 본 키 값(parts 표시가 있는 것)과 읽은 조각들을 합친다. 조각이 깨졌으면 null.
export function joinSave(main: any, parts: unknown[]): any {
  if (parts.length !== PART_COUNT) return null;
  const stats: Stats = {}, discoveries: Discoveries = {};
  for (const p of parts) {
    const part = p as Partial<SavePart> | null;
    if (!part || typeof part !== 'object' || !part.s || typeof part.s !== 'object' || !part.d || typeof part.d !== 'object') return null;
    Object.assign(stats, part.s);
    Object.assign(discoveries, part.d);
  }
  const { parts: _marker, ...rest } = main;
  return { ...rest, progress: { ...(main.progress ?? {}), stats }, discoveries };
}
