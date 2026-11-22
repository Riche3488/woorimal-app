import { marksFor } from './challenge';
import { bumpDaily } from './goals';
import { bumpStreak, localDay } from './growth';
import { newlyMastered, recordResults } from './progress';
import type { SaveData } from '../data/save';
import type { SessionSnapshot } from './session';
export type SessionOutcome = { session: SessionSnapshot; completedAt: number; beforeGrains: number; afterGrains: number; mastered: number };

export function checkpointSession(save: SaveData, session: SessionSnapshot): SaveData {
  const old = save.activeSession;
  if (!old || old.id !== session.id || session.revision <= old.revision) return save;
  let progress = save.progress;
  for (const r of session.round.results.slice(old.recordedCount)) progress = recordResults(progress, [r], r.answeredAt ?? session.round.startedAt);
  const activeSession = { ...session, recordedCount:session.round.results.length,
    masteredCount:(old.masteredCount ?? 0)+newlyMastered(save.progress, progress) };
  return { ...save, progress, activeSession };
}
export function commitSession(save: SaveData, sessionId: string, completedAt: number): SaveData {
  const session = save.activeSession;
  if (!session || session.id !== sessionId || session.phase !== 'ready-to-finish' || save.sessionReceipts.includes(sessionId)) return save;
  const day = localDay(new Date(completedAt)), startDay = session.context.day;
  const challengeHistory = session.context.mode === 'challenge' ? { ...save.challengeHistory, [startDay]:marksFor(session.round.results) } : save.challengeHistory;
  const challenge = session.context.mode === 'challenge' && (!save.challenge.day || startDay >= save.challenge.day)
    ? { day:startDay, marks:challengeHistory[startDay] } : save.challenge;
  const afterGrains = save.totalGrains+session.round.grains;
  return { ...save, activeSession:null, totalGrains:afterGrains, rounds:save.rounds+1,
    streak:bumpStreak(save.streak, day), daily:bumpDaily(save.daily, day), challenge,
    challengeHistory:Object.fromEntries(Object.entries(challengeHistory).sort(([a],[b]) => b.localeCompare(a)).slice(0,30)),
    sessionReceipts:[...save.sessionReceipts,sessionId].slice(-30),
    lastOutcome:{session,completedAt,beforeGrains:save.totalGrains,afterGrains,mastered:session.masteredCount ?? 0} };
}
export function discardSession(save: SaveData, sessionId: string): SaveData {
  return save.activeSession?.id === sessionId ? { ...save,activeSession:null,sessionReceipts:[...save.sessionReceipts,sessionId].slice(-30) } : save;
}
