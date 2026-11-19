import { DAILY_GOAL, bumpDaily, todayRounds, resultNudges } from '../goals';

describe('하루 목표', () => {
  test('같은 날은 더하고, 날짜가 바뀌면 1부터', () => {
    const d1 = bumpDaily({ day: null, rounds: 0 }, '2026-11-19');
    expect(d1).toEqual({ day: '2026-11-19', rounds: 1 });
    expect(bumpDaily(d1, '2026-11-19').rounds).toBe(2);
    expect(bumpDaily(d1, '2026-11-20')).toEqual({ day: '2026-11-20', rounds: 1 });
  });
  test('todayRounds: 다른 날 기록은 0', () => {
    expect(todayRounds({ day: '2026-11-19', rounds: 2 }, '2026-11-19')).toBe(2);
    expect(todayRounds({ day: '2026-11-18', rounds: 2 }, '2026-11-19')).toBe(0);
    expect(DAILY_GOAL).toBe(3);
  });
});

describe('결과 화면 안내', () => {
  const base = { beforeGrains: 60, afterGrains: 120, roundGrains: 60, todayRounds: 1, freezesUsed: 0, freezeEarned: false };
  // Lv2: 50~149, Lv3: 150~299, Lv5(기와 곳간)부터 500

  test('하루 목표 진행', () => {
    expect(resultNudges(base)).toContain('오늘 목표 1/3판');
    expect(resultNudges({ ...base, todayRounds: 3 })).toContain('오늘 목표 달성! 내일 또 만나요');
    expect(resultNudges({ ...base, todayRounds: 4 }).some(t => t.includes('오늘 목표'))).toBe(false);
  });
  test('한 판이면 레벨업할 수 있을 때', () => {
    expect(resultNudges(base)).toContain('레벨업까지 낱알 30개 · 한 판이면 충분해요');
    expect(resultNudges({ ...base, roundGrains: 20 }).some(t => t.includes('레벨업'))).toBe(false);
  });
  test('이번 판에 레벨업했으면 레벨 안내는 생략', () => {
    expect(resultNudges({ ...base, beforeGrains: 140, afterGrains: 160, roundGrains: 20 }).some(t => t.includes('레벨'))).toBe(false);
  });
  test('다음 레벨에 곳간이 바뀌면 알려 준다', () => {
    // 400 → Lv4 (300~499), 다음 Lv5에 기와 곳간
    expect(resultNudges({ ...base, beforeGrains: 380, afterGrains: 400, roundGrains: 20 })).toContain('한 레벨만 더 오르면 기와 곳간으로 커져요');
  });
  test('도토리 안내가 가장 먼저, 최대 2줄', () => {
    const used = resultNudges({ ...base, freezesUsed: 1 });
    expect(used[0]).toBe('🌰 도토리로 연속 기록을 지켰어요');
    expect(used).toHaveLength(2);
    expect(resultNudges({ ...base, freezeEarned: true })[0]).toBe('🌰 도토리를 모았어요. 하루 빠져도 연속 기록을 지켜 줘요');
  });
});
