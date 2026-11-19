import { xpForLevel, levelFor, barnFor, BARN_STAGES, bumpStreak, currentStreak, localDay, freezesUsed, MAX_FREEZES } from '../growth';

test('xpForLevel: Lv1=0, Lv2=50, Lv3=150', () => {
  expect(xpForLevel(1)).toBe(0);
  expect(xpForLevel(2)).toBe(50);
  expect(xpForLevel(3)).toBe(150);
});

test('levelFor: 경계값과 다음 레벨까지 남은 양', () => {
  expect(levelFor(0)).toEqual({ level: 1, into: 0, need: 50 });
  expect(levelFor(49)).toEqual({ level: 1, into: 49, need: 50 });
  expect(levelFor(50)).toEqual({ level: 2, into: 0, need: 100 });
  expect(levelFor(150).level).toBe(3);
});

test('barnFor: 초가 → 기와 → 큰 곳간', () => {
  expect(BARN_STAGES.map(s => s.name)).toEqual(['초가 곳간', '기와 곳간', '큰 곳간']);
  expect(barnFor(4).name).toBe('초가 곳간');
  expect(barnFor(5).name).toBe('기와 곳간');
  expect(barnFor(12).name).toBe('큰 곳간');
});

describe('연속 기록', () => {
  const zero = { days: 0, lastDay: null, freezes: 0 };
  test('같은 날 두 번 풀어도 1', () => {
    expect(bumpStreak(bumpStreak(zero, '2026-11-19'), '2026-11-19')).toEqual({ days: 1, lastDay: '2026-11-19', freezes: 0 });
  });
  test('다음 날 +1, 하루 이상 건너뛰면 1부터', () => {
    const one = bumpStreak(zero, '2026-11-19');
    expect(bumpStreak(one, '2026-11-20').days).toBe(2);
    expect(bumpStreak(one, '2026-11-22').days).toBe(1);
  });
  test('기기 날짜를 되돌리면 그대로', () => {
    const s = { days: 3, lastDay: '2026-11-19', freezes: 0 };
    expect(bumpStreak(s, '2026-11-10')).toEqual(s);
  });
  test('해·달이 바뀌어도 이어진다', () => {
    expect(bumpStreak({ days: 4, lastDay: '2026-12-31', freezes: 0 }, '2027-01-01').days).toBe(5);
    expect(bumpStreak({ days: 4, lastDay: '2027-02-28', freezes: 0 }, '2027-03-01').days).toBe(5);
  });
  test('currentStreak: 오늘·어제 푼 기록만 이어진 것으로 본다', () => {
    const s = { days: 4, lastDay: '2026-11-19', freezes: 0 };
    expect(currentStreak(s, '2026-11-19')).toBe(4);
    expect(currentStreak(s, '2026-11-20')).toBe(4);
    expect(currentStreak(s, '2026-11-21')).toBe(0);
    expect(currentStreak(zero, '2026-11-21')).toBe(0);
  });
  test('localDay는 기기 현지 날짜', () => {
    expect(localDay(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });
});

describe('도토리(연속 기록 보호권)', () => {
  test('예전 저장(freezes 없음)은 도토리 0개로 본다', () => {
    expect(bumpStreak({ days: 3, lastDay: '2026-11-19' } as never, '2026-11-21')).toMatchObject({ days: 1, freezes: 0 });
  });
  test('연속 7일째에 도토리 1개, 최대 2개', () => {
    expect(bumpStreak({ days: 6, lastDay: '2026-11-19', freezes: 0 }, '2026-11-20')).toEqual({ days: 7, lastDay: '2026-11-20', freezes: 1 });
    expect(bumpStreak({ days: 13, lastDay: '2026-11-19', freezes: 1 }, '2026-11-20').freezes).toBe(2);
    expect(bumpStreak({ days: 20, lastDay: '2026-11-19', freezes: 2 }, '2026-11-20').freezes).toBe(MAX_FREEZES);
  });
  test('하루 빠지면 도토리 1개를 쓰고 연속을 잇는다', () => {
    expect(bumpStreak({ days: 4, lastDay: '2026-11-19', freezes: 1 }, '2026-11-21')).toEqual({ days: 5, lastDay: '2026-11-21', freezes: 0 });
  });
  test('빠진 날이 도토리보다 많으면 1부터, 도토리는 남긴다', () => {
    expect(bumpStreak({ days: 4, lastDay: '2026-11-19', freezes: 1 }, '2026-11-22')).toEqual({ days: 1, lastDay: '2026-11-22', freezes: 1 });
  });
  test('currentStreak: 도토리로 메울 수 있으면 아직 이어진 것', () => {
    expect(currentStreak({ days: 4, lastDay: '2026-11-19', freezes: 1 }, '2026-11-21')).toBe(4);
    expect(currentStreak({ days: 4, lastDay: '2026-11-19', freezes: 1 }, '2026-11-22')).toBe(0);
  });
  test('freezesUsed: 오늘 끝내면 쓰게 될 도토리 수', () => {
    const s = { days: 4, lastDay: '2026-11-19', freezes: 2 };
    expect(freezesUsed(s, '2026-11-20')).toBe(0);
    expect(freezesUsed(s, '2026-11-22')).toBe(2);
    expect(freezesUsed(s, '2026-11-23')).toBe(0);
    expect(freezesUsed({ days: 0, lastDay: null, freezes: 1 }, '2026-11-23')).toBe(0);
  });
});
