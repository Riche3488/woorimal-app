import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { pickReviewRound, pickRound } from '../core/picker';
import { reviewKeys } from '../core/progress';
import type { Round } from '../core/round';
import type { AppPack, AppQuestion } from '../core/types';
import { loadPack, refreshPack } from '../data/pack-store';
import { defaultSave, finishRound, loadSave, writeSave, type SaveData, type Settings } from '../data/save';

export type Game = {
  pack: AppPack;
  save: SaveData;
  reviewCount: number;
  lastRound: Round | null;
  previousSave: SaveData | null; // 결과 화면에서 레벨업·곳간 변화를 비교하려고 판 직전 저장을 둔다
  startNormal(): AppQuestion[];
  startReview(): AppQuestion[];
  complete(round: Round): void;
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
  const [previousSave, setPreviousSave] = useState<SaveData | null>(null);
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

  const startNormal = useCallback(() => pickRound(currentPack().questions, save.progress, { now: Date.now() }), [currentPack, save.progress]);
  const startReview = useCallback(() => pickReviewRound(currentPack().questions, save.progress), [currentPack, save.progress]);

  const complete = useCallback((round: Round) => {
    setPreviousSave(save);
    const next = finishRound(save, round, new Date());
    setSave(next);
    setLastRound(round);
    writeSave(next).catch(() => {});
  }, [save]);

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

  const reviewCount = useMemo(() => (pack ? reviewKeys(save.progress, pack.questions).length : 0), [pack, save.progress]);

  if (!ready || !pack) return <>{fallback}</>;
  return (
    <GameContext.Provider value={{ pack, save, reviewCount, lastRound, previousSave, startNormal, startReview, complete, updateSettings, resetRecords }}>
      {children}
    </GameContext.Provider>
  );
}
