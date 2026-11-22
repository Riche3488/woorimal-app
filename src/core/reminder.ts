// 학습 알림: 서버 없이 기기에서 하루 한 번 울릴 알림의 시각과 글을 정한다. 앱을 열거나 판을 마칠 때마다 다시 정한다.
export const REMINDER_HOURS = [8, 12, 19, 21] as const;
export const REMINDER_TITLE = '우리말 곳간';
export const REMINDER_OWNER = 'woorimal.reminder';
export type ReminderSettings = {
  frequency: 'off' | 'daily' | 'three-per-week';
  hour: 8 | 12 | 19 | 21;
};
export type ReminderPlan = {
  id: string;
  weekday?: number;
  hour: number;
  title: string;
  body: string;
};
export function reminderPlans(settings: ReminderSettings): ReminderPlan[] {
  const hour = REMINDER_HOURS.includes(settings.hour) ? settings.hour : 19;
  const base = {
    hour,
    title: REMINDER_TITLE,
    body: '복습할 낱말과 오늘의 목표를 확인해 보세요'
  };
  return settings.frequency === 'daily' ? [{
    ...base,
    id: `${REMINDER_OWNER}.daily`
  }] : settings.frequency === 'three-per-week' ? [2, 4, 6].map(weekday => ({
    ...base,
    id: `${REMINDER_OWNER}.weekday-${weekday}`,
    weekday
  })) : [];
}
export function reminderDestination(active: boolean, due: number): '/play?mode=resume' | '/play?mode=review&count=3' | '/' {
  return active ? '/play?mode=resume' : due ? '/play?mode=review&count=3' : '/';
}
type Input = {
  now: Date;
  hour: number;
  playedToday: boolean;
  dueToday: number;
  dueTomorrow: number;
  streak: number;
};
export function planReminder({
  now,
  hour,
  playedToday,
  dueToday,
  dueTomorrow,
  streak
}: Input): {
  at: Date;
  title: string;
  body: string;
} {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour);
  const tomorrow = !playedToday && now < today ? false : true;
  const at = tomorrow ? new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, hour) : today;
  const due = tomorrow ? dueTomorrow : dueToday;
  let body = '오늘의 낱말과 한 판으로 우리말을 채워 보세요';
  if (due > 0) body = `오늘 복습할 문제 ${due}개가 기다려요`;else if (streak > 0 && playedToday) body = `🔥 ${streak + 1}일째 연속 기록에 도전해요`;else if (streak > 0 && !tomorrow) body = `🔥 ${streak}일 연속 기록을 이어 가세요`;
  return {
    at,
    title: REMINDER_TITLE,
    body
  };
}
