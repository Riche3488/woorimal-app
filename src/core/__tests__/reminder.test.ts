import { planReminder, REMINDER_HOURS } from '../reminder';

const at = (s: string) => new Date(s);

test('알림 시각 선택지', () => expect(REMINDER_HOURS).toEqual([8, 12, 19, 21]));

test('오늘 아직 안 풀었고 알림 시각 전이면 오늘, 복습할 문제가 있으면 그 수를 알린다', () => {
  const plan = planReminder({ now: at('2026-11-20T10:00:00'), hour: 19, playedToday: false, dueToday: 4, dueTomorrow: 6, streak: 3 });
  expect(plan.at).toEqual(at('2026-11-20T19:00:00'));
  expect(plan.body).toBe('오늘 복습할 문제 4개가 기다려요');
});

test('오늘 이미 풀었거나 시각이 지났으면 내일 같은 시각, 내일 복습 수로', () => {
  expect(planReminder({ now: at('2026-11-20T10:00:00'), hour: 19, playedToday: true, dueToday: 4, dueTomorrow: 6, streak: 3 }).at).toEqual(at('2026-11-21T19:00:00'));
  const late = planReminder({ now: at('2026-11-20T20:00:00'), hour: 19, playedToday: false, dueToday: 4, dueTomorrow: 6, streak: 0 });
  expect(late.at).toEqual(at('2026-11-21T19:00:00'));
  expect(late.body).toBe('오늘 복습할 문제 6개가 기다려요');
});

test('복습할 문제가 없으면 연속 기록, 그것도 없으면 한 판 권하기', () => {
  expect(planReminder({ now: at('2026-11-20T10:00:00'), hour: 19, playedToday: false, dueToday: 0, dueTomorrow: 0, streak: 5 }).body).toBe('🔥 5일 연속 기록을 이어 가세요');
  expect(planReminder({ now: at('2026-11-20T10:00:00'), hour: 19, playedToday: false, dueToday: 0, dueTomorrow: 0, streak: 0 }).body).toBe('오늘의 낱말과 한 판으로 우리말을 채워 보세요');
  expect(planReminder({ now: at('2026-11-20T10:00:00'), hour: 19, playedToday: true, dueToday: 0, dueTomorrow: 0, streak: 5 }).body).toBe('🔥 6일째 연속 기록에 도전해요');
});

import { reminderNavigation } from '../reminder';

test('알림을 누르면 판 화면 밖에서는 쌓고, 판 화면에서는 같은 판을 겹쳐 열지 않는다', () => {
  expect(reminderNavigation('/', true, 0)).toEqual({ action: 'push', href: '/play?mode=resume' });
  expect(reminderNavigation('/result', false, 2)).toEqual({ action: 'push', href: '/play?mode=review&count=3' });
  expect(reminderNavigation('/play', true, 2)).toEqual({ action: 'none' });
  expect(reminderNavigation('/play', false, 2)).toEqual({ action: 'replace', href: '/play?mode=review&count=3' });
  expect(reminderNavigation('/', false, 0)).toEqual({ action: 'none' });
  expect(reminderNavigation('/settings', false, 0)).toEqual({ action: 'push', href: '/' });
});
