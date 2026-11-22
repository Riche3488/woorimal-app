import { eligibleActivity, type LearningActivity } from './activity';
import { addDays, localDay } from './growth';
import type { RewardPolicy } from './session';
import type { SaveData } from '../data/save';
export type RewardEntry = {
  activityId: string;
  sessionId?: string;
  grains: number;
  paid: boolean;
};
export type RewardLedger = Record<string, Record<string, RewardEntry>>;
export function rewardForActivity(a: LearningActivity, policy: RewardPolicy): number {
  if (policy !== 'learning-v2' || !eligibleActivity(a) || !a.correct) return 0;
  if (a.source === 'crossword') return a.usedHint ? 3 : 5;
  return 10 + Number(a.firstSeen) * 5 + Number(a.dueBeforeAnswer) * 5;
}
export function creditReward(save: SaveData, a: LearningActivity, policy: RewardPolicy): SaveData {
  if (policy !== 'learning-v2' || !eligibleActivity(a)) return save;
  const day = localDay(new Date(a.occurredAt));
  if (save.rewardLedger[day]?.[a.contentId]) return save;
  const grains = rewardForActivity(a, policy),
    paid = a.source !== 'quiz' || !a.sessionId;
  const entry = {
    activityId: a.id,
    grains,
    paid,
    ...(a.sessionId ? {
      sessionId: a.sessionId
    } : {})
  };
  const ledger = Object.fromEntries(Object.entries(save.rewardLedger).filter(([d, entries]) => d >= addDays(day, -29) || Object.values(entries).some(e => !e.paid && e.sessionId === save.activeSession?.id)));
  return {
    ...save,
    totalGrains: save.totalGrains + (paid ? grains : 0),
    rewardLedger: {
      ...ledger,
      [day]: {
        ...save.rewardLedger[day],
        [a.contentId]: entry
      }
    }
  };
}
