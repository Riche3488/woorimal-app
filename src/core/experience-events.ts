const KINDS = ['session_started', 'answer_submitted', 'feedback_opened', 'feedback_expanded', 'feedback_continued', 'session_paused', 'session_resumed', 'session_finished', 'session_abandoned', 'save_failed', 'activity_credited', 'mission_completed', 'reward_unlocked', 'next_action_selected'] as const;
export type ExperienceEvent = {
  id: string; at: number; kind: typeof KINDS[number]; sessionId?: string;
  mode?: string; answerKind?: string; rulesVersion?: string; packVersion?: string;
  index?: number; correct?: boolean; assisted?: boolean; elapsedMs?: number;
  reason?: 'all-answered' | 'hearts-empty' | 'user-ended';
};
const STRINGS = ['id', 'kind', 'sessionId', 'mode', 'answerKind', 'rulesVersion', 'packVersion', 'reason'];
const NUMBERS = ['at', 'index', 'elapsedMs'];
const BOOLEANS = ['correct', 'assisted'];
export function validExperienceEvent(value: unknown): value is ExperienceEvent {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return typeof v.id === 'string' && !!v.id && typeof v.at === 'number' && Number.isFinite(v.at)
    && KINDS.includes(v.kind as ExperienceEvent['kind'])
    && Object.entries(v).every(([k, x]) => STRINGS.includes(k) ? typeof x === 'string' && x.length <= 160
      : NUMBERS.includes(k) ? typeof x === 'number' && Number.isFinite(x) && x >= 0
        : BOOLEANS.includes(k) && typeof x === 'boolean');
}
export function appendExperienceEvent(items: ExperienceEvent[], event: ExperienceEvent, now: number): ExperienceEvent[] {
  const kept = items.filter(e => validExperienceEvent(e) && e.at >= now - 30 * 86400000 && e.at <= now);
  if (validExperienceEvent(event) && !kept.some(e => e.id === event.id) && event.at >= now - 30 * 86400000 && event.at <= now) kept.push(event);
  return kept.slice(-2000);
}
