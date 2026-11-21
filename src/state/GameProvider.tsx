import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { pickChallenge } from '../core/challenge';
import { withChoiceMode } from '../core/choices';
import { addDays, currentStreak, localDay } from '../core/growth';
import { pickReviewRound, pickRound, pickStarredRound, pickTypeRound } from '../core/picker';
import { notebookCounts } from '../core/progress';
import { planReminder } from '../core/reminder';
import type { Round, RoundResult } from '../core/round';
import type { AppPack, AppQuestion, QuestionType } from '../core/types';
import { loadPack, refreshPack } from '../data/pack-store';
import { scheduleReminder } from '../data/reminder';
import type { CrosswordProgress } from '../core/crossword';
import { makeCrossword, type MadeLevel } from '../core/crossword-make';
import { addMadeCrossword, defaultSave, finishCard, finishRound, loadSave, saveCrossword, toggleStarSave, writeSave, type RoundMode, type SaveData, type Settings } from '../data/save';

export type Game = {
  pack: AppPack;
  save: SaveData;
  counts: { review: number; due: number; starred: number; mastered: number }; // 오답노트 수(due = 오늘 복습)
  lastRound: Round | null;
  lastMode: RoundMode;
  previousSave: SaveData | null; // 결과 화면에서 레벨업·곳간 변화를 비교하려고 판 직전 저장을 둔다
  startNormal(): AppQuestion[];
  startReview(): AppQuestion[];
  startStarred(): AppQuestion[];
  startPractice(type: QuestionType): AppQuestion[];
  lastPracticeType: QuestionType | null;
  toggleStar(key: string): void;
  startChallenge(): AppQuestion[]; // 오늘 날짜로 정해진 5문제
  complete(round: Round, mode?: RoundMode): void;
  answerCard(result: RoundResult): void; // 오늘의 낱말 확인 문제
  updateCrossword(id: string, progress: CrosswordProgress, grains: number, usedChance?: boolean): void; // 퍼즐 진행·낱알·초성 찬스
  makePuzzle(level: MadeLevel): string | null; // 문제를 엮어 조합 퍼즐 한 판을 만들고 그 id를 돌려준다(못 만들면 null)
  updateSettings(patch: Partial<Settings>): void;
  resetRecords(): void; // 테스트 모드: 설정은 두고 낱알·판·기록을 처음으로
};

const GameContext = createContext<Game | null>(null);

export function useGame(): Game {
  const game = useContext(GameContext);
  if (!game) throw new Error('GameProvider 안에서만 쓸 수 있습니다');
  return game;
}

// 테스트에서 값을 직접 넣을 때 쓴다.
export const GameContextProvider = GameContext.Provider;

export function GameProvider({ children, fallback = null }: { children: ReactNode; fallback?: ReactNode }) {
  const [pack, setPack] = useState<AppPack | null>(null);
  const [save, setSave] = useState<SaveData>(defaultSave());
  const [ready, setReady] = useState(false);
  const [lastRound, setLastRound] = useState<Round | null>(null);
  const [lastMode, setLastMode] = useState<RoundMode>('normal');
  const [previousSave, setPreviousSave] = useState<SaveData | null>(null);
  const [lastPracticeType, setLastPracticeType] = useState<QuestionType | null>(null);
  const nextPack = useRef<AppPack | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [p, s] = await Promise.all([loadPack(), loadSave()]);
      if (!alive) return;
      setPack(p);
      setSave(s);
      setReady(true);
      // 새 묶음은 진행 중인 판을 바꾸지 않도록 다음 판부터 쓴다.
      const fresh = await refreshPack(p);
      if (alive && fresh) nextPack.current = fresh;
    })();
    return () => { alive = false; };
  }, []);

  const currentPack = useCallback(() => {
    if (nextPack.current) {
      const fresh = nextPack.current;
      nextPack.current = null;
      setPack(fresh);
      return fresh;
    }
    return pack!;
  }, [pack]);

  // 설정 "보기로 풀기"를 한 판에 적용한다(오늘의 문제 제외).
  const choiceMode = save.settings.choiceMode;
  const start = useCallback((pick: (questions: AppQuestion[]) => AppQuestion[]) => {
    const questions = currentPack().questions;
    return withChoiceMode(pick(questions), questions, choiceMode);
  }, [currentPack, choiceMode]);
  const startNormal = useCallback(() => start(qs => pickRound(qs, save.progress, { now: Date.now() })), [start, save.progress]);
  const startReview = useCallback(() => start(qs => pickReviewRound(qs, save.progress, { now: Date.now() })), [start, save.progress]);
  const startStarred = useCallback(() => start(qs => pickStarredRound(qs, save.progress, { now: Date.now() })), [start, save.progress]);
  const startPractice = useCallback((type: QuestionType) => {
    setLastPracticeType(type);
    return start(qs => pickTypeRound(qs, save.progress, type, { now: Date.now() }));
  }, [start, save.progress]);

  const startChallenge = useCallback(() => pickChallenge(currentPack().questions, localDay(new Date())), [currentPack]);

  // 함수형 갱신: 판 도중 누른 ⭐(toggleStar)가 판 결과 저장에 덮이지 않게 최신 저장 위에 쌓는다.
  const complete = useCallback((round: Round, mode: RoundMode = 'normal') => {
    setSave(prev => {
      setPreviousSave(prev);
      const next = finishRound(prev, round, new Date(), mode);
      writeSave(next).catch(() => {});
      return next;
    });
    setLastRound(round);
    setLastMode(mode);
  }, []);

  const toggleStar = useCallback((key: string) => {
    setSave(prev => {
      const next = toggleStarSave(prev, key);
      writeSave(next).catch(() => {});
      return next;
    });
  }, []);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSave(prev => {
      const next = { ...prev, settings: { ...prev.settings, ...patch } };
      writeSave(next).catch(() => {});
      return next;
    });
  }, []);

  const resetRecords = useCallback(() => {
    setSave(prev => {
      const next = { ...defaultSave(), settings: prev.settings };
      writeSave(next).catch(() => {});
      return next;
    });
    setLastRound(null);
    setPreviousSave(null);
  }, []);

  const answerCard = useCallback((result: RoundResult) => {
    setSave(prev => {
      const next = finishCard(prev, result, new Date());
      writeSave(next).catch(() => {});
      return next;
    });
  }, []);

  const updateCrossword = useCallback((id: string, progress: CrosswordProgress, grains: number, usedChance = false) => {
    setSave(prev => {
      const next = saveCrossword(prev, id, progress, grains, new Date(), usedChance);
      writeSave(next).catch(() => {});
      return next;
    });
  }, []);

  // 앞서 만든 판의 낱말은 되도록 피해서 새 낱말로 엮는다.
  const makePuzzle = useCallback((level: MadeLevel) => {
    if (!pack) return null;
    const num = 1 + Math.max(0, ...save.madeCrosswords.map(b => Number(/^made-(\d+)$/.exec(b.id)?.[1] ?? 0)));
    const avoid = new Set(save.madeCrosswords.flatMap(b => b.entries.map(e => e.answer)));
    const board = makeCrossword(pack.questions, { level, id: `made-${num}`, num, rng: Math.random, avoid });
    if (!board) return null;
    setSave(prev => {
      const next = addMadeCrossword(prev, board);
      writeSave(next).catch(() => {});
      return next;
    });
    return board.id;
  }, [pack, save.madeCrosswords]);

  const counts = useMemo(() => (pack ? notebookCounts(save.progress, pack.questions, localDay(new Date())) : { review: 0, due: 0, starred: 0, mastered: 0 }), [pack, save.progress]);

  // 학습 알림: 기록·설정이 바뀔 때마다 다음 한 번을 다시 예약한다(끄면 지운다).
  const { reminder, reminderHour } = save.settings;
  useEffect(() => {
    if (!ready || !pack) return;
    const now = new Date();
    const today = localDay(now);
    const plan = reminder ? planReminder({
      now, hour: reminderHour, playedToday: save.streak.lastDay === today,
      dueToday: counts.due, dueTomorrow: notebookCounts(save.progress, pack.questions, addDays(today, 1)).due,
      streak: currentStreak(save.streak, today),
    }) : null;
    scheduleReminder(plan).catch(() => {});
  }, [ready, pack, reminder, reminderHour, save.streak, save.progress, counts.due]);

  if (!ready || !pack) return <>{fallback}</>;
  return (
    <GameContext.Provider value={{ pack, save, counts, lastRound, lastMode, previousSave, lastPracticeType, startNormal, startReview, startStarred, startPractice, toggleStar, startChallenge, complete, answerCard, updateCrossword, makePuzzle, updateSettings, resetRecords }}>
      {children}
    </GameContext.Provider>
  );
}
