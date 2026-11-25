import { REMINDER_HOURS, reminderNavigation } from '../reminder';

test('알림 시각 선택지', () => expect(REMINDER_HOURS).toEqual([8, 12, 19, 21]));

test('알림을 누르면 판 화면 밖에서는 쌓고, 판 화면에서는 같은 판을 겹쳐 열지 않는다', () => {
  expect(reminderNavigation('/', true, 0)).toEqual({ action: 'push', href: '/play?mode=resume' });
  expect(reminderNavigation('/result', false, 2)).toEqual({ action: 'push', href: '/play?mode=review&count=3' });
  expect(reminderNavigation('/play', true, 2)).toEqual({ action: 'none' });
  expect(reminderNavigation('/play', false, 2)).toEqual({ action: 'replace', href: '/play?mode=review&count=3' });
  expect(reminderNavigation('/', false, 0)).toEqual({ action: 'none' });
  expect(reminderNavigation('/settings', false, 0)).toEqual({ action: 'push', href: '/' });
});
