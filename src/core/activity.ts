import { addDays, bumpStreak, localDay } from './growth';
import { normalizeAnswer } from './grading';
import type { SaveData } from '../data/save';
import type { SessionSnapshot } from './session';
export type LearningActivity = {
  id: string;
  contentId: string;
  source: 'quiz' | 'card' | 'crossword';
  occurredAt: number;
  correct: boolean;
  assisted: boolean;
  usedHint: boolean;
  timedOut: boolean;
  gaveUp: boolean;
  autoFilled: boolean;
  firstSeen: boolean;
  dueBeforeAnswer: boolean;
  word?: string;
  sessionId?: string;
};
export type ActivityState = {
  day: string;
  contentIds: string[];
  migratedComplete: boolean;
  lastAt?: number;
};
export type Discovery = {
  word: string;
  at: number;
  explain?: string;
  masteredAt?: number;
};
export function eligibleActivity(a: LearningActivity): boolean {
  return !a.assisted && !a.timedOut && !a.gaveUp && !a.autoFilled;
}
export function dailyProgress(activity: Record<string, ActivityState>, day: string) {
  const d = activity[day],
    learned = d?.contentIds.length ?? 0;
  return {
    learned,
    milestones: d?.migratedComplete ? 3 : [1, 3, 5].filter(n => learned >= n).length,
    complete: !!d?.migratedComplete || learned >= 5,
    migratedComplete: !!d?.migratedComplete
  };
}
export function applyActivity(save: SaveData, a: LearningActivity): SaveData {
  if (!eligibleActivity(a)) return save;
  const day = localDay(new Date(a.occurredAt));
  const old = save.activity[day] ?? {
    day,
    contentIds: [],
    migratedComplete: false
  };
  const contentIds = old.contentIds.includes(a.contentId) ? old.contentIds : [...old.contentIds, a.contentId];
  const activity = Object.fromEntries(Object.entries({
    ...save.activity,
    [day]: {
      ...old,
      contentIds,
      lastAt: contentIds === old.contentIds ? old.lastAt : a.occurredAt
    }
  }).filter(([d]) => d >= addDays(day, -29)));
  const id = a.word ? normalizeAnswer(a.word) : '';
  const discoveries = id && a.correct && !save.discoveries[id] ? {
    ...save.discoveries,
    [id]: {
      word: a.word!,
      at: a.occurredAt
    }
  } : save.discoveries;
  return {
    ...save,
    activity,
    discoveries,
    streak: bumpStreak(save.streak, day)
  };
}
export function activityForResult(save: SaveData, session: SessionSnapshot, index: number): LearningActivity {
  const r = session.round.results[index],
    q = session.round.questions[index],
    stat = save.progress.stats[q.key],
    occurredAt = r.answeredAt ?? session.round.startedAt;
  return {
    id: `${session.id}:${index}`,
    sessionId: session.id,
    contentId: `q:${q.key}`,
    source: 'quiz',
    occurredAt,
    correct: r.correct,
    assisted: false,
    usedHint: false,
    timedOut: r.timedOut,
    gaveUp: r.gaveUp,
    autoFilled: false,
    firstSeen: !stat?.seen,
    dueBeforeAnswer: !!stat?.box && !!stat.dueDay && stat.dueDay <= localDay(new Date(occurredAt)),
    ...(['meaning', 'chosung', 'spelling'].includes(q.type) ? {
      word: q.answer
    } : {})
  };
}
