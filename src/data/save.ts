// 기기 안 저장(계정 없음). 나중에 계정 동기화를 붙일 때도 문제 key 기준 기록을 그대로 올린다.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { bumpStreak, localDay, type Streak } from '../core/growth';
import { marksFor, type ChallengeRecord } from '../core/challenge';
import { bumpDaily, type Daily } from '../core/goals';
import { emptyProgress, normalizeStat, recordResults, toggleStar, type Progress } from '../core/progress';
import type { Round } from '../core/round';

export const SAVE_KEY = 'woorimal.save.v1';

export type Settings = { haptics: boolean; sound: boolean; testMode: boolean };
export type SaveData = { schema: 1; totalGrains: number; rounds: number; streak: Streak; daily: Daily; challenge: ChallengeRecord; progress: Progress; settings: Settings };

export function defaultSave(): SaveData {
  return { schema: 1, totalGrains: 0, rounds: 0, streak: { days: 0, lastDay: null, freezes: 0 }, daily: { day: null, rounds: 0 }, challenge: { day: null, marks: '' }, progress: emptyProgress(), settings: { haptics: true, sound: true, testMode: false } };
}

export async function loadSave(): Promise<SaveData> {
  try {
    const text = await AsyncStorage.getItem(SAVE_KEY);
    if (!text) return defaultSave();
    const data = JSON.parse(text);
    if (data?.schema !== 1 || typeof data.totalGrains !== 'number' || !data.progress?.stats) return defaultSave();
    const base = defaultSave();
    const stats = Object.fromEntries(Object.entries(data.progress.stats).map(([k, v]) => [k, normalizeStat(v as Parameters<typeof normalizeStat>[0])]));
    const progress: Progress = { triesByType: data.progress.triesByType ?? {}, stats };
    return { ...base, ...data, progress, streak: { ...base.streak, ...data.streak }, daily: { ...base.daily, ...data.daily }, challenge: { ...base.challenge, ...data.challenge }, settings: { ...base.settings, ...data.settings } };
  } catch {
    return defaultSave();
  }
}

export async function writeSave(d: SaveData): Promise<void> {
  await AsyncStorage.setItem(SAVE_KEY, JSON.stringify(d));
}

export type RoundMode = 'normal' | 'review' | 'challenge' | 'starred' | 'practice';

export function toggleStarSave(d: SaveData, key: string): SaveData {
  return { ...d, progress: toggleStar(d.progress, key) };
}

export function finishRound(d: SaveData, round: Round, now: Date, mode: RoundMode = 'normal'): SaveData {
  return {
    ...d,
    challenge: mode === 'challenge' ? { day: localDay(now), marks: marksFor(round.results) } : d.challenge,
    totalGrains: d.totalGrains + round.grains,
    rounds: d.rounds + 1,
    progress: recordResults(d.progress, round.results, now.getTime()),
    streak: bumpStreak(d.streak, localDay(now)),
    daily: bumpDaily(d.daily, localDay(now)),
  };
}
