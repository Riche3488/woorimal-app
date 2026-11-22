import { appendExperienceEvent, validExperienceEvent, type ExperienceEvent } from '../experience-events';
const event = (id: string, at = 4_000_000_000): ExperienceEvent => ({
  id,
  at,
  kind: 'session_started',
  sessionId: 's1',
  mode: 'normal'
});
test('rejects_answer_and_prompt_fields', () => {
  expect(validExperienceEvent({
    ...event('a'),
    answer: '비밀 답'
  })).toBe(false);
  expect(validExperienceEvent({
    ...event('a'),
    prompt: '문제 원문'
  })).toBe(false);
  expect(validExperienceEvent(event('a'))).toBe(true);
});
test('duplicate_event_id_is_ignored', () => {
  expect(appendExperienceEvent([event('a')], event('a'), 4_000_000_000)).toHaveLength(1);
});
test('retention_is_30_days_and_at_most_2000_events', () => {
  const now = 4_000_000_000;
  const items = [event('expired', 0), ...Array.from({
    length: 2000
  }, (_, i) => event(String(i), now))];
  const result = appendExperienceEvent(items, event('last', now), now);
  expect(result).toHaveLength(2000);
  expect(result[0].id).toBe('1');
  expect(result.at(-1)?.id).toBe('last');
});
