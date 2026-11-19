// 기기 안 저장(계정 없음). 나중에 계정 동기화를 붙일 때도 문제 key 기준 기록을 그대로 올린다.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { bumpStreak, localDay, type Streak } from '../core/growth';
import { emptyProgress, recordResults, type Progress } from '../core/progress';
import type { Round } from '../core/round';

export const SAVE_KEY = 'woorimal.save.v1';

export type Settings = { haptics: boolean; sound: boolean };
export type SaveData = { schema: 1; totalGrains: number; rounds: number; streak: Streak; progress: Progress; settings: Settings };

export function defaultSave(): SaveData {
  return { schema: 1, totalGrains: 0, rounds: 0, streak: { days: 0, lastDay: null }, progress: emptyProgress(), settings: { haptics: true, sound: true } };
}

export async function loadSave(): Promise<SaveData> {
  try {
    const text = await AsyncStorage.getItem(SAVE_KEY);
    if (!text) return defaultSave();
    const data = JSON.parse(text);
    if (data?.schema !== 1 || typeof data.totalGrains !== 'number' || !data.progress?.stats) return defaultSave();
    return { ...defaultSave(), ...data, settings: { ...defaultSave().settings, ...data.settings } };
  } catch {
    return defaultSave();
  }
}

export async function writeSave(d: SaveData): Promise<void> {
  await AsyncStorage.setItem(SAVE_KEY, JSON.stringify(d));
}

export function finishRound(d: SaveData, round: Round, now: Date): SaveData {
  return {
    ...d,
    totalGrains: d.totalGrains + round.grains,
    rounds: d.rounds + 1,
    progress: recordResults(d.progress, round.results, now.getTime()),
    streak: bumpStreak(d.streak, localDay(now)),
  };
}
