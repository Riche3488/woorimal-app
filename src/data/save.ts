// 기기 안 저장(계정 없음). 나중에 계정 동기화를 붙일 때도 문제 key 기준 기록을 그대로 올린다.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { bumpStreak, localDay, type Streak } from '../core/growth';
import { marksFor, type ChallengeRecord } from '../core/challenge';
import { earnChance, spendChance, type ChanceState, type CrosswordProgress } from '../core/crossword';
import { bumpDaily, type Daily } from '../core/goals';
import { validCrossword } from '../core/pack';
import type { AppCrossword } from '../core/types';
import { emptyProgress, normalizeStat, recordResults, toggleStar, type Progress } from '../core/progress';
import type { Round, RoundResult } from '../core/round';
import { parseSession, type SessionSnapshot } from '../core/session';
import type { SessionOutcome } from '../core/session-commit';

export const SAVE_KEY = 'woorimal.save.v1';

// choiceMode: 직접 입력하는 문제를 보기 4개 고르기로 푼다(src/core/choices.ts). 오늘의 문제는 모두에게 같아야 하므로 바꾸지 않는다.
// reminder·reminderHour: 하루 한 번 기기 알림(src/core/reminder.ts, src/data/reminder.ts).
export type Settings = { haptics: boolean; sound: boolean; testMode: boolean; choiceMode: boolean; reminder: boolean; reminderHour: number; autoAdvanceCorrect?: boolean };
// card.day: 오늘의 낱말 확인 문제를 푼 날. chance: 퍼즐 초성 보기 찬스(src/core/crossword.ts ChanceState). crosswords: 퍼즐 판 id별 진행.
// madeCrosswords: 기기에서 문제를 엮어 만든 조합 퍼즐 판(src/core/crossword-make.ts). 새 판이 앞.
export type SaveData = { schema: 1; totalGrains: number; rounds: number; streak: Streak; daily: Daily; challenge: ChallengeRecord; card: { day: string | null }; chance: ChanceState; crosswords: Record<string, CrosswordProgress>; madeCrosswords: AppCrossword[]; progress: Progress; settings: Settings;
  activeSession: SessionSnapshot | null; lastOutcome: SessionOutcome | null; sessionReceipts: string[]; challengeHistory: Record<string,string>; quarantinedSession?: unknown;
};

export function defaultSave(): SaveData {
  return { schema: 1, totalGrains: 0, rounds: 0, streak: { days: 0, lastDay: null, freezes: 0 }, daily: { day: null, rounds: 0 }, challenge: { day: null, marks: '' }, card: { day: null }, chance: { day: null, bonus: 0 }, crosswords: {}, madeCrosswords: [], progress: emptyProgress(), settings: { haptics: true, sound: true, testMode: false, choiceMode: true, reminder: false, reminderHour: 19 },activeSession:null,lastOutcome:null,sessionReceipts:[],challengeHistory:{} };
}

// 퍼즐 진행 저장. 낱말을 직접 맞혀 낱알을 받으면 오늘 공부한 날로 연속 기록에 센다(판 수·하루 목표는 그대로).
// usedChance: 초성 보기 찬스를 하나 쓴다. completed: 이번에 판을 다 풀었으면 덤 찬스를 하나 더한다.
export function saveCrossword(d: SaveData, id: string, progress: CrosswordProgress, grains: number, now: Date, opts: { usedChance?: boolean; completed?: boolean } = {}): SaveData {
  let chance = d.chance;
  if (opts.usedChance) chance = spendChance(chance, localDay(now));
  if (opts.completed) chance = earnChance(chance);
  return {
    ...d,
    chance,
    crosswords: { ...d.crosswords, [id]: progress },
    totalGrains: d.totalGrains + grains,
    streak: grains > 0 ? bumpStreak(d.streak, localDay(now)) : d.streak,
  };
}

export const MADE_KEEP = 20; // 조합 퍼즐은 이만큼만 남긴다

// 만든 판을 맨 앞에 넣는다. 넘치면 오래된 판부터 지우고 그 진행도 지운다.
export function addMadeCrossword(d: SaveData, board: AppCrossword): SaveData {
  const kept = [board, ...d.madeCrosswords.filter(b => b.id !== board.id)];
  const dropped = new Set(kept.slice(MADE_KEEP).map(b => b.id));
  const crosswords = Object.fromEntries(Object.entries(d.crosswords).filter(([id]) => !dropped.has(id)));
  return { ...d, madeCrosswords: kept.slice(0, MADE_KEEP), crosswords };
}

// 저장된 퍼즐 진행을 형식에 맞게 거른다(깨진 판 기록만 버린다).
function readCrosswords(raw: unknown): Record<string, CrosswordProgress> {
  if (!raw || typeof raw !== 'object') return {};
  const out: Record<string, CrosswordProgress> = {};
  for (const [id, v] of Object.entries(raw as Record<string, any>)) {
    if (!v || !Array.isArray(v.solved) || !v.solved.every(Number.isInteger)) continue;
    const revealed = v.revealed && typeof v.revealed === 'object' ? Object.fromEntries(Object.entries(v.revealed).filter(([, s]) => typeof s === 'string')) as Record<string, string> : {};
    out[id] = { solved: v.solved, revealed, helps: Number.isFinite(v.helps) ? v.helps : 0 };
    if (Array.isArray(v.chosung)) out[id].chosung = v.chosung.filter(Number.isInteger);
  }
  return out;
}

function readChance(raw: any): ChanceState {
  const day = typeof raw?.day === 'string' ? raw.day : null;
  const bonus = Number.isInteger(raw?.bonus) && raw.bonus > 0 ? raw.bonus : 0;
  return { day, bonus };
}

// 오늘의 낱말 확인 문제 한 개: 문제 기록(틀리면 오답노트)만 남기고 판·낱알·하루 목표는 세지 않는다.
export function finishCard(d: SaveData, result: RoundResult, now: Date): SaveData {
  return { ...d, card: { day: localDay(now) }, progress: recordResults(d.progress, [result], now.getTime()) };
}

export type SaveLoadResult = { kind: 'missing' | 'loaded'; save: SaveData } | { kind: 'invalid'; raw: string } | { kind: 'io-error' };
export async function loadSaveResult(): Promise<SaveLoadResult> {
  let text: string | null;
  try { text = await AsyncStorage.getItem(SAVE_KEY); } catch { return { kind: 'io-error' }; }
  if (!text) return { kind: 'missing', save: defaultSave() };
  try {
    const data = JSON.parse(text);
    if (data?.schema !== 1 || !Number.isFinite(data.totalGrains) || data.totalGrains < 0 || !data.progress?.stats || typeof data.progress.stats !== 'object') return { kind: 'invalid', raw: text };
    const base = defaultSave();
    // 깨진 항목은 그 문제 기록만 버린다(저장 전체를 잃지 않게).
    const num = (x: unknown) => (typeof x === 'number' && Number.isFinite(x) ? x : 0);
    const stats = Object.fromEntries(Object.entries(data.progress.stats as Record<string, unknown>)
      .filter(([, v]) => v && typeof v === 'object')
      .map(([k, v]) => {
        const o = v as Record<string, unknown>;
        return [k, normalizeStat({ ...o, seen: num(o.seen), correct: num(o.correct), lastAt: num(o.lastAt) })];
      }));
    const progress: Progress = { triesByType: data.progress.triesByType ?? {}, stats };
    const active = parseSession(data.activeSession);
    const outcome = data.lastOutcome;
    const validOutcome = outcome && parseSession(outcome.session) && Number.isFinite(outcome.completedAt) && Number.isFinite(outcome.beforeGrains) && Number.isFinite(outcome.afterGrains);
    return { kind: 'loaded', save: { ...base, ...data, progress, streak: { ...base.streak, ...data.streak }, daily: { ...base.daily, ...data.daily }, challenge: { ...base.challenge, ...data.challenge }, card: { ...base.card, ...data.card }, chance: readChance(data.chance), crosswords: readCrosswords(data.crosswords), madeCrosswords: Array.isArray(data.madeCrosswords) ? data.madeCrosswords.filter(validCrossword) : [], settings: { ...base.settings, ...data.settings, choiceMode: data.settings?.choiceMode === true },
      activeSession:active ? {...active,paused:true} : null, lastOutcome:validOutcome ? outcome : null,
      sessionReceipts:Array.isArray(data.sessionReceipts) ? data.sessionReceipts.filter((id: unknown) => typeof id === 'string').slice(-30) : [],
      challengeHistory:data.challengeHistory && typeof data.challengeHistory === 'object' ? Object.fromEntries(Object.entries(data.challengeHistory).filter(([k,v]) => /^\d{4}-\d{2}-\d{2}$/.test(k) && typeof v === 'string' && /^[oxt]*$/.test(v))) : {},
      ...(data.activeSession && !active ? {quarantinedSession:data.activeSession} : {}),
    } };
  } catch {
    return { kind: 'invalid', raw: text };
  }
}

// Compatibility for pure data consumers. The application uses loadSaveResult and blocks on errors.
export async function loadSave(): Promise<SaveData> {
  const result = await loadSaveResult();
  return 'save' in result ? result.save : defaultSave();
}

export async function writeSave(d: SaveData): Promise<void> {
  await AsyncStorage.setItem(SAVE_KEY, JSON.stringify(d));
}

export type { RoundMode } from '../core/session';
import type { RoundMode } from '../core/session';

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
