// 낱알(경험치)로 오르는 레벨, 레벨에 따른 곳간 단계, 하루 단위 연속 기록.

export function xpForLevel(level: number): number {
  return (50 * (level - 1) * level) / 2;
}

export function levelFor(totalGrains: number): { level: number; into: number; need: number } {
  let level = 1;
  while (xpForLevel(level + 1) <= totalGrains) level++;
  return { level, into: totalGrains - xpForLevel(level), need: xpForLevel(level + 1) - xpForLevel(level) };
}

export const BARN_STAGES = [
  { from: 1, name: '초가 곳간' },
  { from: 5, name: '기와 곳간' },
  { from: 12, name: '큰 곳간' },
] as const;

export function barnFor(level: number) {
  return [...BARN_STAGES].reverse().find(s => level >= s.from) ?? BARN_STAGES[0];
}

export type Streak = { days: number; lastDay: string | null };

const pad = (n: number) => String(n).padStart(2, '0');
export function localDay(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// 'YYYY-MM-DD' 두 날짜 사이의 일 수(달력 기준, 시간대와 무관).
function dayDiff(from: string, to: string): number {
  const toUtc = (d: string) => { const [y, m, day] = d.split('-').map(Number); return Date.UTC(y, m - 1, day); };
  return Math.round((toUtc(to) - toUtc(from)) / 86_400_000);
}

export function bumpStreak(s: Streak, today: string): Streak {
  if (!s.lastDay) return { days: 1, lastDay: today };
  const diff = dayDiff(s.lastDay, today);
  if (diff <= 0) return s;
  return { days: diff === 1 ? s.days + 1 : 1, lastDay: today };
}

export function currentStreak(s: Streak, today: string): number {
  if (!s.lastDay) return 0;
  const diff = dayDiff(s.lastDay, today);
  return diff === 0 || diff === 1 ? s.days : 0;
}
