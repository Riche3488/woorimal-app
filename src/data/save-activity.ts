import { addDays, localDay } from '../core/growth';
import type { SaveData } from './save';
import { DECORATIONS, type DecorationId } from '../core/decorations';
import type { RewardEntry } from '../core/rewards';
export function readLearningState(raw: any, now: Date): Pick<SaveData, 'activity' | 'rewardLedger' | 'discoveries' | 'activityVersion' | 'decorations'> {
  const today = localDay(now),
    cutoff = addDays(today, -29);
  const activity: SaveData['activity'] = {},
    rewardLedger: SaveData['rewardLedger'] = {},
    discoveries: SaveData['discoveries'] = {};
  const dayOk = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);
  if (raw.activity && typeof raw.activity === 'object') for (const [day, value] of Object.entries(raw.activity) as [string, any][]) {
    if (dayOk(day) && day >= cutoff && value && Array.isArray(value.contentIds)) activity[day] = {
      day,
      contentIds: [...new Set(value.contentIds.filter((id: unknown) => typeof id === 'string'))] as string[],
      migratedComplete: value.migratedComplete === true,
      ...(Number.isFinite(value.lastAt) ? {
        lastAt: value.lastAt
      } : {})
    };
  }
  if (raw.activityVersion !== 1 && (raw.daily?.day === today && raw.daily.rounds > 0 || raw.card?.day === today || raw.streak?.lastDay === today)) activity[today] = {
    day: today,
    contentIds: [],
    migratedComplete: true
  };
  if (raw.rewardLedger && typeof raw.rewardLedger === 'object') for (const [day, entries] of Object.entries(raw.rewardLedger) as [string, any][]) {
    if (!dayOk(day) || !entries || typeof entries !== 'object') continue;
    const kept = Object.entries(entries).filter(([, e]: [string, any]) => e && typeof e.activityId === 'string' && Number.isFinite(e.grains) && e.grains >= 0 && typeof e.paid === 'boolean' && (day >= cutoff || !e.paid && e.sessionId === raw.activeSession?.id));
    if (kept.length) rewardLedger[day] = Object.fromEntries(kept as [string, RewardEntry][]);
  }
  if (raw.discoveries && typeof raw.discoveries === 'object') for (const [id, d] of Object.entries(raw.discoveries) as [string, any][]) {
    if (d && typeof d.word === 'string' && Number.isFinite(d.at)) discoveries[id] = {
      word: d.word,
      at: d.at,
      ...(typeof d.explain === 'string' ? {
        explain: d.explain
      } : {}),
      ...(Number.isFinite(d.masteredAt) ? {
        masteredAt: d.masteredAt
      } : {})
    };
  }
  const unlocked: DecorationId[] = Array.isArray(raw.decorations?.unlocked) ? [...new Set(raw.decorations.unlocked.filter((id: unknown) => typeof id === 'string' && Object.hasOwn(DECORATIONS, id)))] as DecorationId[] : [];
  const equipped = unlocked.includes(raw.decorations?.equipped) ? raw.decorations.equipped : null;
  return {
    activity,
    rewardLedger,
    discoveries,
    activityVersion: 1,
    decorations: {
      unlocked,
      equipped
    }
  };
}
