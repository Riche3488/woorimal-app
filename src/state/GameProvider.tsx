import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { createSaveStore, type SaveStore } from '../data/save-store';
import { checkpointSession, commitSession, discardSession } from '../core/session-commit';
import { createSession, policyFor, type SessionSnapshot } from '../core/session';
import { recordExperienceEvent } from '../data/experience-events';
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
import { addMadeCrossword, defaultSave, finishCard, finishRound, loadSaveResult, saveCrossword, toggleStarSave, writeSave, type RoundMode, type SaveData, type Settings } from '../data/save';

export type Game = {
  sessions?: {
    begin(mode: RoundMode, type?: QuestionType): Promise<SessionSnapshot>;
    checkpoint(session: SessionSnapshot): Promise<void>;
    finish(id: string): Promise<void>;
    discard(id: string): Promise<void>;
  };
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
  updateCrossword(id: string, progress: CrosswordProgress, grains: number, opts?: { usedChance?: boolean; completed?: boolean }): void; // 퍼즐 진행·낱알·초성 찬스
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
  const store = useRef<SaveStore | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [writeError, setWriteError] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const failedWrite = useRef<(() => Promise<unknown>) | null>(null);
  const persist = useCallback(async (reduce: (latest: SaveData) => SaveData): Promise<SaveData> => {
    if (!store.current) throw new Error('저장소가 준비되지 않았어요');
    try {
      const next = await store.current.update(reduce);
      setSave(next);
      if(next.lastOutcome){
        setLastRound(next.lastOutcome.session.round);setLastMode(next.lastOutcome.session.context.mode);
        setLastPracticeType(next.lastOutcome.session.context.practiceType??null);
        setPreviousSave({...next,totalGrains:next.lastOutcome.beforeGrains});
      }
      setWriteError(!!failedWrite.current);
      return next;
    } catch (error) {
      setWriteError(true);
      if(!failedWrite.current)failedWrite.current = () => persist(reduce);
      throw error;
    }
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [p, loaded] = await Promise.all([loadPack(), loadSaveResult()]);
      if (!alive) return;
      if (!('save' in loaded)) { setLoadError(true); return; }
      const s = loaded.save;
      setLoadError(false);
      store.current = createSaveStore(s, writeSave);
      setPack(p);
      setSave(s);
      if (s.lastOutcome) {
        setLastRound(s.lastOutcome.session.round); setLastMode(s.lastOutcome.session.context.mode);
        setLastPracticeType(s.lastOutcome.session.context.practiceType ?? null);
        setPreviousSave({...s,totalGrains:s.lastOutcome.beforeGrains});
      }
      setReady(true);
      // 새 묶음은 진행 중인 판을 바꾸지 않도록 다음 판부터 쓴다.
      const fresh = await refreshPack(p);
      if (alive && fresh) nextPack.current = fresh;
    })();
    return () => { alive = false; };
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

  const sessions = useMemo(() => ({
    async begin(mode: RoundMode, type?: QuestionType): Promise<SessionSnapshot> {
      await store.current!.flush();
      const p=currentPack(), now=Date.now(), latest=store.current!.current();
      if (latest.activeSession) throw new Error('진행 중인 판을 먼저 이어 하거나 끝내 주세요.');
      const opts={now};
      let qs=mode==='challenge'?pickChallenge(p.questions,localDay(new Date(now)))
        :mode==='review'?pickReviewRound(p.questions,latest.progress,opts)
        :mode==='starred'?pickStarredRound(p.questions,latest.progress,opts)
        :mode==='practice' && type?pickTypeRound(p.questions,latest.progress,type,opts):pickRound(p.questions,latest.progress,opts);
      if (mode==='challenge' && (latest.challenge.day===localDay(new Date(now)) || latest.challengeHistory[localDay(new Date(now))])) throw new Error('오늘의 문제는 이미 풀었어요.');
      if (mode!=='challenge') qs=withChoiceMode(qs,p.questions,latest.settings.choiceMode);
      if (!qs.length) throw new Error('풀 문제가 없어요.');
      const context={mode,day:localDay(new Date(now)),packVersion:p.version,rulesVersion:'experience-v1',...(type?{practiceType:type}:{})};
      const session=createSession(qs,context,now,`${now.toString(36)}-${Math.random().toString(36).slice(2,12)}`,policyFor(mode,{autoAdvanceCorrect:latest.settings.autoAdvanceCorrect}));
      await persist(d=>{if(d.activeSession)throw new Error('진행 중인 판이 있어요.');return {...d,activeSession:session};});
      void recordExperienceEvent({id:`${session.id}:start`,at:now,kind:'session_started',sessionId:session.id,mode,packVersion:p.version,rulesVersion:context.rulesVersion}).catch(()=>{});
      return session;
    },
    async checkpoint(snapshot: SessionSnapshot) {
      const prev=store.current!.current().activeSession;
      await persist(d=>checkpointSession(d,snapshot));
      for (let i=prev?.recordedCount??0;i<snapshot.round.results.length;i++) {
        const r=snapshot.round.results[i];
        void recordExperienceEvent({id:`${snapshot.id}:answer:${i}`,at:r.answeredAt??Date.now(),kind:'answer_submitted',sessionId:snapshot.id,mode:snapshot.context.mode,index:i,correct:r.correct,assisted:false,elapsedMs:r.elapsedMs,answerKind:snapshot.round.questions[i].kind}).catch(()=>{});
      }
      if(prev && prev.paused!==snapshot.paused) void recordExperienceEvent({id:`${snapshot.id}:${snapshot.revision}:pause`,at:Date.now(),kind:snapshot.paused?'session_paused':'session_resumed',sessionId:snapshot.id}).catch(()=>{});
    },
    async finish(id: string) {
      const before=store.current!.current();
      const next=await persist(d=>commitSession(d,id,Date.now()));
      const out=next.lastOutcome;
      if(out?.session.id===id){setPreviousSave(before);setLastRound(out.session.round);setLastMode(out.session.context.mode);setLastPracticeType(out.session.context.practiceType??null);}
      void recordExperienceEvent({id:`${id}:finish`,at:Date.now(),kind:'session_finished',sessionId:id,reason:out?.session.round.hearts===0?'hearts-empty':'all-answered'}).catch(()=>{});
    },
    async discard(id: string) {
      await persist(d=>discardSession(d,id));
      void recordExperienceEvent({id:`${id}:abandon`,at:Date.now(),kind:'session_abandoned',sessionId:id,reason:'user-ended'}).catch(()=>{});
    },
  }),[currentPack,persist]);

  // 함수형 갱신: 판 도중 누른 ⭐(toggleStar)가 판 결과 저장에 덮이지 않게 최신 저장 위에 쌓는다.
  const complete = useCallback((round: Round, mode: RoundMode = 'normal') => {
    const before = store.current?.current();
    void persist(prev => finishRound(prev, round, new Date(), mode)).then(() => { if (before) setPreviousSave(before); }).catch(() => {});
    setLastRound(round);
    setLastMode(mode);
  }, [persist]);

  const toggleStar = useCallback((key: string) => {
    void persist(prev => toggleStarSave(prev, key)).catch(() => {});
  }, [persist]);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    void persist(prev => ({ ...prev, settings: { ...prev.settings, ...patch } })).catch(() => {});
  }, [persist]);

  const resetRecords = useCallback(() => {
    void persist(prev => ({ ...defaultSave(), settings: prev.settings })).catch(() => {});
    setLastRound(null);
    setPreviousSave(null);
  }, [persist]);

  const answerCard = useCallback((result: RoundResult) => {
    void persist(prev => finishCard(prev, result, new Date())).catch(() => {});
  }, [persist]);

  const updateCrossword = useCallback((id: string, progress: CrosswordProgress, grains: number, opts?: { usedChance?: boolean; completed?: boolean }) => {
    void persist(prev => saveCrossword(prev, id, progress, grains, new Date(), opts)).catch(() => {});
  }, [persist]);

  // 앞서 만든 판의 낱말은 되도록 피해서 새 낱말로 엮는다.
  const makePuzzle = useCallback((level: MadeLevel) => {
    if (!pack) return null;
    const num = 1 + Math.max(0, ...save.madeCrosswords.map(b => Number(/^made-(\d+)$/.exec(b.id)?.[1] ?? 0)));
    const avoid = new Set(save.madeCrosswords.flatMap(b => b.entries.map(e => e.answer)));
    const board = makeCrossword(pack.questions, { level, id: `made-${num}`, num, rng: Math.random, avoid });
    if (!board) return null;
    void persist(prev => addMadeCrossword(prev, board)).catch(() => {});
    return board.id;
  }, [pack, save.madeCrosswords, persist]);

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

  if (loadError) return <View style={{ flex: 1, padding: 24, justifyContent: 'center', gap: 16 }}>
    <Text>기록을 불러오지 못했어요. 저장된 기록을 덮어쓰지 않았어요.</Text>
    <Pressable accessibilityRole="button" onPress={() => setLoadAttempt(n => n + 1)}><Text>다시 시도</Text></Pressable>
  </View>;
  if (!ready || !pack) return <>{fallback}</>;
  return (
    <GameContext.Provider value={{ pack, save, sessions, counts, lastRound, lastMode, previousSave, lastPracticeType, startNormal, startReview, startStarred, startPractice, toggleStar, startChallenge, complete, answerCard, updateCrossword, makePuzzle, updateSettings, resetRecords }}>
      {writeError && <View accessibilityRole="alert" style={{ padding: 16, backgroundColor: '#FFF0D0' }}><Text>저장하지 못했어요</Text><Pressable accessibilityRole="button" onPress={() => { const retry=failedWrite.current;failedWrite.current=null;void retry?.().catch(() => {}); }}><Text>다시 시도</Text></Pressable></View>}
      {children}
    </GameContext.Provider>
  );
}
