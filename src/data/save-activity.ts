import { addDays, localDay } from '../core/growth';
import type { SaveData } from './save';
import { DECORATIONS, SLOTS, emptySlots, type DecorationId } from '../core/decorations';
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
  // 예전 저장은 장식 하나(문자열)만 장착했고 '확인함' 목록이 없었다 → 첫 자리로 옮기고, 이미 얻은 장식은 확인한 것으로 본다.
  const rawEquipped: unknown[] = Array.isArray(raw.decorations?.equipped) ? raw.decorations.equipped : [raw.decorations?.equipped];
  const equipped = emptySlots();
  rawEquipped.slice(0, SLOTS).forEach((id, i) => {
    if (unlocked.includes(id as DecorationId) && !equipped.includes(id as DecorationId)) equipped[i] = id as DecorationId;
  });
  const seen: DecorationId[] = Array.isArray(raw.decorations?.seen) ? unlocked.filter(id => raw.decorations.seen.includes(id)) : [...unlocked];
  return {
    activity,
    rewardLedger,
    discoveries,
    activityVersion: 1,
    decorations: {
      unlocked,
      equipped,
      seen
    }
  };
}
