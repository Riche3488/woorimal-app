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

// 도토리(freezes): 하루 빠져도 연속 기록을 지켜 주는 보호권. 연속 7의 배수 날마다 1개, 최대 2개.
export const MAX_FREEZES = 2;
export const FREEZE_EVERY = 7;
export type Streak = { days: number; lastDay: string | null; freezes: number };

const pad = (n: number) => String(n).padStart(2, '0');
export function localDay(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// 'YYYY-MM-DD' 두 날짜 사이의 일 수(달력 기준, 시간대와 무관).
export function dayDiff(from: string, to: string): number {
  const toUtc = (d: string) => { const [y, m, day] = d.split('-').map(Number); return Date.UTC(y, m - 1, day); };
  return Math.round((toUtc(to) - toUtc(from)) / 86_400_000);
}

export function addDays(day: string, n: number): string {
  const [y, m, d] = day.split('-').map(Number);
  return localDay(new Date(y, m - 1, d + n));
}

// 오늘 판을 끝내면 연속을 잇느라 쓰게 될 도토리 수(못 메우면 0).
export function freezesUsed(s: Streak, today: string): number {
  if (!s.lastDay) return 0;
  const missed = dayDiff(s.lastDay, today) - 1;
  return missed >= 1 && missed <= (s.freezes ?? 0) ? missed : 0;
}

export function bumpStreak(s: Streak, today: string): Streak {
  const freezes = s.freezes ?? 0;
  if (!s.lastDay) return { days: 1, lastDay: today, freezes };
  const diff = dayDiff(s.lastDay, today);
  if (diff <= 0) return { ...s, freezes };
  const used = freezesUsed(s, today);
  if (diff > 1 && used === 0) return { days: 1, lastDay: today, freezes };
  const days = s.days + 1;
  const left = freezes - used;
  return { days, lastDay: today, freezes: days % FREEZE_EVERY === 0 ? Math.min(MAX_FREEZES, left + 1) : left };
}

export function currentStreak(s: Streak, today: string): number {
  if (!s.lastDay) return 0;
  const diff = dayDiff(s.lastDay, today);
  return diff === 0 || diff === 1 || freezesUsed(s, today) > 0 ? s.days : 0;
}
