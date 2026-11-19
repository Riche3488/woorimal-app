// 하루 목표와 결과 화면의 "다음 목표" 안내. 목표를 채우면 마무리 인사를 하고 더 권하지 않는다.
import { barnFor, levelFor } from './growth';

export const DAILY_GOAL = 3;
export type Daily = { day: string | null; rounds: number };

export function bumpDaily(d: Daily, today: string): Daily {
  return d.day === today ? { day: today, rounds: d.rounds + 1 } : { day: today, rounds: 1 };
}

export function todayRounds(d: Daily, today: string): number {
  return d.day === today ? d.rounds : 0;
}

export type NudgeInput = {
  beforeGrains: number;
  afterGrains: number;
  roundGrains: number;
  todayRounds: number; // 이번 판을 포함한 오늘 판 수
  freezesUsed: number;
  freezeEarned: boolean;
  mastered?: number; // 이번 판에서 외운(오답노트에서 졸업한) 문제 수
};

export function resultNudges(i: NudgeInput): string[] {
  const out: string[] = [];
  if (i.mastered && i.mastered > 0) out.push(`📒 ${i.mastered}문제를 외웠어요`);
  if (i.freezesUsed > 0) out.push('🌰 도토리로 연속 기록을 지켰어요');
  else if (i.freezeEarned) out.push('🌰 도토리를 모았어요. 하루 빠져도 연속 기록을 지켜 줘요');

  if (i.todayRounds < DAILY_GOAL) out.push(`오늘 목표 ${i.todayRounds}/${DAILY_GOAL}판`);
  else if (i.todayRounds === DAILY_GOAL) out.push('오늘 목표 달성! 내일 또 만나요');

  const before = levelFor(i.beforeGrains);
  const after = levelFor(i.afterGrains);
  if (after.level === before.level) {
    const left = after.need - after.into;
    const nextBarn = barnFor(after.level + 1).name;
    if (nextBarn !== barnFor(after.level).name) out.push(`한 레벨만 더 오르면 ${nextBarn}으로 커져요`);
    else if (i.roundGrains > 0 && left <= i.roundGrains) out.push(`레벨업까지 낱알 ${left}개 · 한 판이면 충분해요`);
  }
  return out.slice(0, 2);
}
