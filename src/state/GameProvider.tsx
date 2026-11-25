import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState, Pressable, Text, View } from 'react-native';
import { createSaveStore, type SaveStore } from '../data/save-store';
import { checkpointSession, commitSession, discardSession } from '../core/session-commit';
import { createSession, policyFor, type SessionSnapshot } from '../core/session';
import { recordExperienceEvent } from '../data/experience-events';
import { finishCrosswordEntry } from '../data/save';
import { syncDecorations, equipDecoration, unequipDecoration, unequipAll, markDecorationsSeen, type DecorationId } from '../core/decorations';
import { seedDiscoveries } from '../core/collection';
import { pickQuickRound } from '../core/quick-play';
import { useToday } from './useToday';
import { pickAdaptiveRound } from '../core/adaptive-picker';
import { TEST_MODE_OK } from '../data/build';
import { dailyProgress } from '../core/activity';
import { pickChallenge } from '../core/challenge';
import { withChoiceMode, choiceAvailability } from '../core/choices';
import { localDay } from '../core/growth';
import { pickReviewRound, pickRound, pickStarredRound, pickTypeRound } from '../core/picker';
import { notebookCounts } from '../core/progress';
import { reminderPlans, type ReminderSettings } from '../core/reminder';
import type { Round, RoundResult } from '../core/round';
import type { AppPack, QuestionType } from '../core/types';
import { loadPack, refreshPack } from '../data/pack-store';
import { replaceOwnedReminders } from '../data/reminder';
import type { CrosswordProgress } from '../core/crossword';
import { makeCrossword, type MadeLevel } from '../core/crossword-make';
import { addMadeCrossword, backupBrokenSave, defaultSave, finishCard, loadSaveResult, toggleStarSave, writeSave, type RoundMode, type SaveData, type Settings } from '../data/save';
export type Game = {
  sessions?: {
    begin(mode: RoundMode, type?: QuestionType, count?: number): Promise<SessionSnapshot>;
    checkpoint(session: SessionSnapshot): Promise<SessionSnapshot | void>;
    finish(id: string): Promise<void>;
    discard(id: string): Promise<void>;
  };
  equipDecoration?(id: DecorationId): Promise<boolean>; // 빈 자리에 놓는다(이미 있으면 그대로). 마지막 저장 기준으로 놓였는지 돌려준다
  unequipDecoration?(id: DecorationId): void;
  unequipDecorations?(): void;
  markDecorationsSeen?(): void;
  today?: string;
  pack: AppPack;
  save: SaveData;
  counts: {
    review: number;
    due: number;
    starred: number;
    mastered: number;
  }; // 오답노트 수(due = 오늘 복습)
  lastRound: Round | null;
  lastMode: RoundMode;
  previousSave: SaveData | null; // 결과 화면에서 레벨업·곳간 변화를 비교하려고 판 직전 저장을 둔다
  lastPracticeType: QuestionType | null;
  toggleStar(key: string): void;
  answerCard(result: RoundResult): Promise<SaveData>; // 저장 확인 뒤 피드백
  updateCrossword(id: string, progress: CrosswordProgress, grains: number, opts?: {
    usedChance?: boolean;
    completed?: boolean;
    entryIndex?: number;
    submittedAt?: number;
  }): Promise<SaveData>; // 퍼즐 진행·낱알·초성 찬스
  makePuzzle(level: MadeLevel): Promise<string | null>; // 조합 퍼즐 한 판을 만들어 저장한 뒤 그 id를 돌려준다(못 만들거나 저장 못 하면 null)
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
export function GameProvider({
  children,
  fallback = null
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const today = useToday();
  const [pack, setPack] = useState<AppPack | null>(null);
  const [save, setSave] = useState<SaveData>(defaultSave());
  const [ready, setReady] = useState(false);
  const [lastRound, setLastRound] = useState<Round | null>(null);
  const [lastMode, setLastMode] = useState<RoundMode>('normal');
  const [previousSave, setPreviousSave] = useState<SaveData | null>(null);
  const [lastPracticeType, setLastPracticeType] = useState<QuestionType | null>(null);
  const nextPack = useRef<AppPack | null>(null);
  const store = useRef<SaveStore | null>(null);
  // pack: 문제 묶음을 못 읽음, io: 저장을 못 읽음, broken: 저장이 깨짐(원문 보관)
  const [loadError, setLoadError] = useState<null | {
    kind: 'pack' | 'io';
  } | {
    kind: 'broken';
    raw: string;
  }>(null);
  const [resetError, setResetError] = useState(false);
  const [writeError, setWriteError] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const pendingWrites = useRef<{
    reduce: (latest: SaveData) => SaveData;
    key?: string;
    saved?: SaveData;
  }[]>([]);
  const writeTail = useRef<Promise<unknown>>(Promise.resolve());
  const [reminderError, setReminderError] = useState(false),
    [reminderAttempt, setReminderAttempt] = useState(0);
  const applyWrite = useCallback(async (reduce: (latest: SaveData) => SaveData): Promise<SaveData> => {
    if (!store.current) throw new Error('저장소가 준비되지 않았어요');
    let before = store.current.current();
    const next = await store.current.update(prev => {
      before = prev;
      return syncDecorations(reduce(prev));
    });
    setSave(next);
    for (const [day, d] of Object.entries(next.activity)) {
      const old = before.activity[day]?.contentIds.length ?? 0;
      for (let i = old; i < d.contentIds.length; i++) void recordExperienceEvent({
        id: `activity:${day}:${i}`,
        at: d.lastAt ?? Date.now(),
        kind: 'activity_credited'
      }).catch(() => {});
      if (dailyProgress(next.activity, day).complete && !dailyProgress(before.activity, day).complete) void recordExperienceEvent({
        id: `mission:${day}`,
        at: d.lastAt ?? Date.now(),
        kind: 'mission_completed'
      }).catch(() => {});
    }
    for (const id of next.decorations.unlocked) if (!before.decorations.unlocked.includes(id)) void recordExperienceEvent({
      id: `unlock:${id}`,
      at: Date.now(),
      kind: 'reward_unlocked'
    }).catch(() => {});
    if (next.lastOutcome) {
      setLastRound(next.lastOutcome.session.round);
      setLastMode(next.lastOutcome.session.context.mode);
      setLastPracticeType(next.lastOutcome.session.context.practiceType ?? null);
      setPreviousSave({
        ...next,
        totalGrains: next.lastOutcome.beforeGrains
      });
    }
    return next;
  }, []);
  const drainWrites = useCallback(() => {
    const run = writeTail.current.then(async () => {
      try {
        while (pendingWrites.current.length) {
          const operation = pendingWrites.current[0];
          let invalidOperation = false;
          try {
            operation.saved = await applyWrite(latest => {
              try {
                return operation.reduce(latest);
              } catch (error) {
                invalidOperation = true;
                throw error;
              }
            });
          } catch (error) {
            // A rejected game action is not a disk operation to replay forever.
            if (invalidOperation) pendingWrites.current.shift();
            throw error;
          }
          pendingWrites.current.shift();
        }
        setWriteError(false);
      } catch (error) {
        setWriteError(pendingWrites.current.length > 0);
        throw error;
      }
    });
    writeTail.current = run.catch(() => {});
    return run;
  }, [applyWrite]);
  const persist = useCallback(async (reduce: (latest: SaveData) => SaveData, key?: string): Promise<SaveData> => {
    const operation = key === undefined ? undefined : pendingWrites.current.find(p => p.key === key);
    const requested = operation ?? {
      reduce,
      key,
      saved: undefined as SaveData | undefined
    };
    if (!operation) pendingWrites.current.push(requested);
    await drainWrites();
    return requested.saved ?? store.current!.current();
  }, [drainWrites]);
  useEffect(() => {
    let alive = true;
    (async () => {
      const loaded = await loadSaveResult();
      if (!alive) return;
      if (!('save' in loaded)) {
        setLoadError(loaded.kind === 'invalid' ? {
          kind: 'broken',
          raw: loaded.raw
        } : {
          kind: 'io'
        });
        return;
      }
      let p: AppPack;
      try {
        p = await loadPack();
      } catch {
        if (alive) setLoadError({
          kind: 'pack'
        });
        return;
      }
      if (!alive) return;
      const seeded = seedDiscoveries(loaded.save, p.questions);
      const s = syncDecorations(seeded);
      // 불러오는 순간 새 조건으로 얻은 장식(업데이트 직후 기존 사용자)도 해금 기록을 남긴다.
      for (const id of s.decorations.unlocked) if (!seeded.decorations.unlocked.includes(id)) void recordExperienceEvent({
        id: `unlock:${id}`,
        at: Date.now(),
        kind: 'reward_unlocked'
      }).catch(() => {});
      setLoadError(null);
      store.current = createSaveStore(s, writeSave);
      setPack(p);
      setSave(s);
      if (s.lastOutcome) {
        setLastRound(s.lastOutcome.session.round);
        setLastMode(s.lastOutcome.session.context.mode);
        setLastPracticeType(s.lastOutcome.session.context.practiceType ?? null);
        setPreviousSave({
          ...s,
          totalGrains: s.lastOutcome.beforeGrains
        });
      }
      setReady(true);
      // 새 묶음은 진행 중인 판을 바꾸지 않도록 다음 판부터 쓴다.
      const fresh = await refreshPack(p);
      if (alive && fresh) nextPack.current = fresh;
    })();
    return () => {
      alive = false;
    };
  }, [loadAttempt]);
  const currentPack = useCallback(() => {
    if (nextPack.current) {
      const fresh = nextPack.current;
      nextPack.current = null;
      setPack(fresh);
      return fresh;
    }
    return pack!;
  }, [pack]);

  const sessions = useMemo(() => ({
    async begin(mode: RoundMode, type?: QuestionType, count?: number): Promise<SessionSnapshot> {
      await store.current!.flush();
      const p = currentPack(),
        now = Date.now(),
        latest = store.current!.current();
      if (latest.activeSession) throw new Error('진행 중인 판을 먼저 이어 하거나 끝내 주세요.');
      const opts = {
        now,
        ...(count ? {
          count: Math.min(10, Math.max(1, count))
        } : {})
      };
      const adaptive = TEST_MODE_OK && latest.settings.adaptivePractice === true;
      let qs = mode === 'challenge' ? pickChallenge(p.questions, localDay(new Date(now))) : mode === 'review' ? pickReviewRound(p.questions, latest.progress, opts) : mode === 'starred' ? pickStarredRound(p.questions, latest.progress, opts) : mode === 'practice' && type ? pickTypeRound(p.questions, latest.progress, type, opts) : mode === 'quick' ? adaptive ? pickAdaptiveRound(p.questions.filter(choiceAvailability(p.questions)), latest.progress, {
        now,
        rng: Math.random,
        count: 5,
        choiceMode: true
      }) : pickQuickRound(p.questions, latest.progress, {
        now,
        rng: Math.random
      }) : adaptive ? pickAdaptiveRound(p.questions, latest.progress, {
        now,
        rng: Math.random,
        count: opts.count ?? 10,
        choiceMode: latest.settings.choiceMode
      }) : pickRound(p.questions, latest.progress, opts);
      if (mode === 'challenge' && (latest.challenge.day === localDay(new Date(now)) || latest.challengeHistory[localDay(new Date(now))])) throw new Error('오늘의 문제는 이미 풀었어요.');
      if (mode === 'quick' && qs.length < 3) qs = [];
      if (mode !== 'challenge' && mode !== 'quick' && !(adaptive && mode === 'normal')) qs = withChoiceMode(qs, p.questions, latest.settings.choiceMode);
      if (!qs.length) throw new Error('풀 문제가 없어요.');
      const context = {
        mode,
        day: localDay(new Date(now)),
        packVersion: p.version,
        rulesVersion: 'experience-v2',
        ...(type ? {
          practiceType: type
        } : {}),
        ...(count ? {
          count
        } : {})
      };
      const session = createSession(qs, context, now, `${now.toString(36)}-${Math.random().toString(36).slice(2, 12)}`, policyFor(mode, {
        autoAdvanceCorrect: latest.settings.autoAdvanceCorrect,
        rewardPolicy: 'learning-v2'
      }));
      await persist(d => {
        if (d.activeSession) throw new Error('진행 중인 판이 있어요.');
        return {
          ...d,
          activeSession: session
        };
      });
      void recordExperienceEvent({
        id: `${session.id}:start`,
        at: now,
        kind: 'session_started',
        sessionId: session.id,
        mode,
        packVersion: p.version,
        rulesVersion: context.rulesVersion
      }).catch(() => {});
      return session;
    },
    async checkpoint(snapshot: SessionSnapshot) {
      const prev = store.current!.current().activeSession;
      const saved = await persist(d => checkpointSession(d, snapshot), `checkpoint:${snapshot.id}:${snapshot.revision}`);
      for (let i = prev?.recordedCount ?? 0; i < snapshot.round.results.length; i++) {
        const r = snapshot.round.results[i];
        void recordExperienceEvent({
          id: `${snapshot.id}:answer:${i}`,
          at: r.answeredAt ?? Date.now(),
          kind: 'answer_submitted',
          sessionId: snapshot.id,
          mode: snapshot.context.mode,
          index: i,
          correct: r.correct,
          assisted: false,
          elapsedMs: r.elapsedMs,
          answerKind: snapshot.round.questions[i].kind
        }).catch(() => {});
      }
      if (prev && prev.paused !== snapshot.paused) void recordExperienceEvent({
        id: `${snapshot.id}:${snapshot.revision}:pause`,
        at: Date.now(),
        kind: snapshot.paused ? 'session_paused' : 'session_resumed',
        sessionId: snapshot.id
      }).catch(() => {});
      return saved.activeSession ?? undefined;
    },
    async finish(id: string) {
      const before = store.current!.current();
      const completedAt = Date.now();
      const next = await persist(d => commitSession(d, id, completedAt), `finish:${id}`);
      const out = next.lastOutcome;
      if (out?.session.id === id) {
        setPreviousSave(before);
        setLastRound(out.session.round);
        setLastMode(out.session.context.mode);
        setLastPracticeType(out.session.context.practiceType ?? null);
      }
      void recordExperienceEvent({
        id: `${id}:finish`,
        at: Date.now(),
        kind: 'session_finished',
        sessionId: id,
        reason: out?.session.round.hearts === 0 ? 'hearts-empty' : 'all-answered'
      }).catch(() => {});
    },
    async discard(id: string) {
      await persist(d => discardSession(d, id));
      void recordExperienceEvent({
        id: `${id}:abandon`,
        at: Date.now(),
        kind: 'session_abandoned',
        sessionId: id,
        reason: 'user-ended'
      }).catch(() => {});
    }
  }), [currentPack, persist]);

  const toggleStar = useCallback((key: string) => {
    void persist(prev => toggleStarSave(prev, key)).catch(() => {});
  }, [persist]);
  const updateSettings = useCallback((patch: Partial<Settings>) => {
    void persist(prev => {
      const settings = {
        ...prev.settings,
        ...patch
      };
      if (patch.reminderFrequency !== undefined) settings.reminder = patch.reminderFrequency !== 'off';else if (patch.reminder !== undefined) settings.reminderFrequency = patch.reminder ? 'daily' : 'off';
      return {
        ...prev,
        settings
      };
    }).catch(() => {});
  }, [persist]);
  const resetRecords = useCallback(() => {
    void persist(prev => ({
      ...defaultSave(),
      settings: prev.settings
    })).catch(() => {});
    setLastRound(null);
    setPreviousSave(null);
  }, [persist]);
  const answerCard = useCallback((result: RoundResult) => {
    const submittedAt = new Date(result.answeredAt ?? Date.now());
    return persist(prev => finishCard(prev, result, submittedAt, pack?.cards?.find(c => c.question === result.key)?.word), `card:${localDay(submittedAt)}:${result.key}`);
  }, [persist, pack]);
  const updateCrossword = useCallback((id: string, progress: CrosswordProgress, _grains: number, opts?: {
    usedChance?: boolean;
    completed?: boolean;
    entryIndex?: number;
    submittedAt?: number;
  }) => {
    const submittedAt = new Date(opts?.submittedAt ?? Date.now());
    return persist(prev => {
      const board = prev.madeCrosswords.find(b => b.id === id) ?? pack?.crosswords?.find(b => b.id === id);
      return board ? finishCrosswordEntry(prev, board, progress, opts?.entryIndex ?? null, submittedAt) : prev;
    }, `crossword:${id}:${submittedAt.getTime()}:${JSON.stringify(progress)}`);
  }, [persist, pack]);

  // 앞서 만든 판의 낱말은 되도록 피해서 새 낱말로 엮는다.
  const makePuzzle = useCallback(async (level: MadeLevel) => {
    if (!pack) return null;
    const num = 1 + Math.max(0, ...save.madeCrosswords.map(b => Number(/^made-(\d+)$/.exec(b.id)?.[1] ?? 0)));
    const avoid = new Set(save.madeCrosswords.flatMap(b => b.entries.map(e => e.answer)));
    const board = makeCrossword(pack.questions, {
      level,
      id: `made-${num}`,
      num,
      rng: Math.random,
      avoid
    });
    if (!board) return null;
    try {
      await persist(prev => addMadeCrossword(prev, board));
      return board.id;
    } catch {
      return null;
    }
  }, [pack, save.madeCrosswords, persist]);
  const counts = useMemo(() => pack ? notebookCounts(save.progress, pack.questions, today) : {
    review: 0,
    due: 0,
    starred: 0,
    mastered: 0
  }, [pack, save.progress, today]);
  const {
    reminder,
    reminderHour,
    reminderFrequency
  } = save.settings;
  useEffect(() => {
    if (!ready) return;
    let alive = true;
    const refresh = () => {
      void replaceOwnedReminders(reminderPlans({
        frequency: reminder ? reminderFrequency ?? 'daily' : 'off',
        hour: reminderHour as ReminderSettings['hour']
      })).then(() => {
        if (alive) setReminderError(false);
      }).catch(() => {
        if (alive) setReminderError(true);
      });
    };
    refresh();
    const sub = AppState.addEventListener('change', s => {
      if (s === 'active') refresh();
    });
    return () => {
      alive = false;
      sub.remove();
    };
  }, [ready, reminder, reminderHour, reminderFrequency, reminderAttempt]);
  if (loadError) return <View style={{
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    gap: 16
  }}>
    <Text>{loadError.kind === 'pack' ? '문제를 불러오지 못했어요. 앱을 다시 열거나 업데이트해 주세요.' : '기록을 불러오지 못했어요. 저장된 기록을 덮어쓰지 않았어요.'}</Text>
    <Pressable accessibilityRole="button" onPress={() => setLoadAttempt(n => n + 1)}><Text>다시 시도</Text></Pressable>
    {loadError.kind === 'broken' && <>
      <Text>기록이 손상되어 읽을 수 없어요. 새로 시작하면 손상된 기록은 기기 안에 따로 보관해 둬요.</Text>
      <Pressable accessibilityRole="button" onPress={() => {
        void backupBrokenSave(loadError.raw).then(() => {
          setResetError(false);
          setLoadAttempt(n => n + 1);
        }).catch(() => setResetError(true));
      }}><Text>새로 시작하기</Text></Pressable>
      {resetError && <Text accessibilityRole="alert">새로 시작하지 못했어요. 기기 저장 공간을 확인해 주세요.</Text>}
    </>}
  </View>;
  if (!ready || !pack) return <>{fallback}</>;
  return <GameContext.Provider value={{
    pack,
    save,
    sessions,
    today,
    equipDecoration: id => persist(d => equipDecoration(d, id)).then(next => next.decorations.equipped.includes(id), () => true),
    unequipDecoration: id => {
      void persist(d => unequipDecoration(d, id)).catch(() => {});
    },
    unequipDecorations: () => {
      void persist(unequipAll).catch(() => {});
    },
    markDecorationsSeen: () => {
      void persist(markDecorationsSeen).catch(() => {});
    },
    counts,
    lastRound,
    lastMode,
    previousSave,
    lastPracticeType,
    toggleStar,
    answerCard,
    updateCrossword,
    makePuzzle,
    updateSettings,
    resetRecords
  }}>
      {writeError && <View accessibilityRole="alert" style={{
      padding: 16,
      backgroundColor: '#FFF0D0'
    }}><Text>저장하지 못했어요</Text><Pressable accessibilityRole="button" onPress={() => {
        void drainWrites().catch(() => {});
      }}><Text>다시 시도</Text></Pressable></View>}
      {reminderError && <View accessibilityRole="alert" style={{
      padding: 12
    }}><Text>기기에 알림을 예약하지 못했어요</Text><Pressable accessibilityRole="button" onPress={() => setReminderAttempt(n => n + 1)}><Text>다시 예약</Text></Pressable></View>}
      {children}
    </GameContext.Provider>;
}
