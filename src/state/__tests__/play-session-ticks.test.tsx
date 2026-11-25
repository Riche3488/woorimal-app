// 100ms 시계는 화면에 보이는 것이 바뀔 때만 다시 그린다(한글 입력 중 쓸데없는 다시 그리기 방지).
import { act, renderHook } from '@testing-library/react-native';
import { createSession, policyFor, type RoundMode } from '../../core/session';
import type { AppQuestion } from '../../core/types';
import { usePlaySession } from '../usePlaySession';
jest.mock('../../data/experience-events', () => ({ recordExperienceEvent: jest.fn(async () => {}) }));
const q: AppQuestion = { key: 'meaning:1', type: 'meaning', kind: 'typed', prompt: '뜻', answer: '포옹', explain: '', source: 'original', easy: true };
const start = (mode: RoundMode) => createSession([q], { mode, day: '2026-11-25', packVersion: 'p', rulesVersion: '1' }, Date.now(), 's', policyFor(mode));
beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());
// 한 act 안의 갱신은 한 번에 그려지므로 100ms씩 따로 흘려 보낸다.
const advance = async (ms: number) => {
  for (let t = 0; t < ms; t += 100) await act(async () => {
    jest.advanceTimersByTime(100);
  });
};

test('untimed_question_ticks_do_not_rerender_but_still_count_elapsed_time', async () => {
  let renders = 0;
  const { result } = await renderHook(() => {
    renders++;
    return usePlaySession(start('review'));
  });
  const before = renders;
  await advance(1000);
  expect(renders).toBe(before);
  await act(async () => {
    result.current.dispatch({ kind: 'answer', input: '포옹', answeredAt: Date.now() });
  });
  expect(result.current.session.round.results[0].elapsedMs).toBeGreaterThanOrEqual(1000);
});

test('timed_question_ticks_keep_the_timer_moving', async () => {
  let renders = 0;
  await renderHook(() => {
    renders++;
    return usePlaySession(start('normal'));
  });
  const before = renders;
  await advance(1000);
  expect(renders).toBeGreaterThan(before + 5);
});
