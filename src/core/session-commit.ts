import { marksFor } from './challenge';
import { bumpDaily } from './goals';
import { bumpStreak, localDay } from './growth';
import { newlyMastered, recordResults, recordRecentAttempt } from './progress';
import type { SaveData } from '../data/save';
import type { SessionSnapshot } from './session';
import { activityForResult, applyActivity } from './activity';
import { creditReward } from './rewards';
import { normalizeAnswer } from './grading';
export type SessionOutcome = {
  session: SessionSnapshot;
  completedAt: number;
  beforeGrains: number;
  afterGrains: number;
  mastered: number;
};
export function checkpointSession(save: SaveData, session: SessionSnapshot): SaveData {
  const old = save.activeSession;
  if (!old || old.id !== session.id || session.revision <= old.revision) return save;
  let next = save;
  const results = session.round.results.map((result, i) => {
    if (i < old.recordedCount) return old.round.results[i];
    const activity = activityForResult(next, session, i);
    next = applyActivity(next, activity);
    let grains = result.grains;
    if (session.policy.rewardPolicy === 'learning-v2') {
      const day = localDay(new Date(activity.occurredAt));
      const previous = next.rewardLedger[day]?.[activity.contentId];
      next = creditReward(next, activity, 'learning-v2');
      grains = previous ? 0 : next.rewardLedger[day]?.[activity.contentId]?.grains ?? 0;
    }
    next = {
      ...next,
      progress: recordRecentAttempt(recordResults(next.progress, [result], result.answeredAt ?? session.round.startedAt), session.round.questions[i], result)
    };
    if (activity.word && next.progress.stats[result.key].mastered) {
      const id = normalizeAnswer(activity.word),
        word = next.discoveries[id];
      if (word && !word.masteredAt) next = {
        ...next,
        discoveries: {
          ...next.discoveries,
          [id]: {
            ...word,
            masteredAt: activity.occurredAt
          }
        }
      };
    }
    return {
      ...result,
      grains
    };
  });
  const activeSession = {
    ...session,
    round: {
      ...session.round,
      results,
      grains: results.reduce((sum, r) => sum + r.grains, 0)
    },
    recordedCount: results.length,
    masteredCount: (old.masteredCount ?? 0) + newlyMastered(save.progress, next.progress)
  };
  return {
    ...next,
    activeSession
  };
}
export function commitSession(save: SaveData, sessionId: string, completedAt: number): SaveData {
  const session = save.activeSession;
  if (!session || session.id !== sessionId || session.phase !== 'ready-to-finish' || save.sessionReceipts.includes(sessionId)) return save;
  const day = localDay(new Date(completedAt)),
    startDay = session.context.day;
  const challengeHistory = session.context.mode === 'challenge' ? {
    ...save.challengeHistory,
    [startDay]: marksFor(session.round.results)
  } : save.challengeHistory;
  const challenge = session.context.mode === 'challenge' && (!save.challenge.day || startDay >= save.challenge.day) ? {
    day: startDay,
    marks: challengeHistory[startDay]
  } : save.challenge;
  const afterGrains = save.totalGrains + session.round.grains;
  return {
    ...save,
    activeSession: null,
    totalGrains: afterGrains,
    rounds: save.rounds + 1,
    streak: session.policy.rewardPolicy === 'learning-v2' ? save.streak : bumpStreak(save.streak, day),
    daily: bumpDaily(save.daily, day),
    challenge,
    rewardLedger: Object.fromEntries(Object.entries(save.rewardLedger).map(([day, entries]) => [day, Object.fromEntries(Object.entries(entries).map(([id, e]) => [id, e.sessionId === sessionId ? {
      ...e,
      paid: true
    } : e]))])),
    challengeHistory: Object.fromEntries(Object.entries(challengeHistory).sort(([a], [b]) => b.localeCompare(a)).slice(0, 30)),
    sessionReceipts: [...save.sessionReceipts, sessionId].slice(-30),
    lastOutcome: {
      session,
      completedAt,
      beforeGrains: save.totalGrains,
      afterGrains,
      mastered: session.masteredCount ?? 0
    }
  };
}
export function discardSession(save: SaveData, sessionId: string): SaveData {
  return save.activeSession?.id === sessionId ? {
    ...save,
    activeSession: null,
    sessionReceipts: [...save.sessionReceipts, sessionId].slice(-30),
    rewardLedger: Object.fromEntries(Object.entries(save.rewardLedger).map(([day, entries]) => [day, Object.fromEntries(Object.entries(entries).filter(([, e]) => e.sessionId !== sessionId || e.paid))]))
  } : save;
}
