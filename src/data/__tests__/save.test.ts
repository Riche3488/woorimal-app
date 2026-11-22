import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadSave, writeSave, finishRound, finishCard, saveCrossword, addMadeCrossword, defaultSave, toggleStarSave, MADE_KEEP, SAVE_KEY } from '../save';
import { startRound, answer } from '../../core/round';
import type { AppQuestion } from '../../core/types';
import { loadSaveResult } from '../save';
import { finishCrosswordEntry } from '../save';
import { dailyProgress } from '../../core/activity';
import { localDay } from '../../core/growth';
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
const q = (n: number): AppQuestion => ({
  key: `meaning:${n}`,
  type: 'meaning',
  kind: 'typed',
  prompt: '뜻',
  answer: `답${n}`,
  explain: '',
  source: 'original',
  easy: true
});
beforeEach(() => AsyncStorage.clear());
test('load distinguishes missing, invalid and io-error without overwriting raw data', async () => {
  expect((await loadSaveResult()).kind).toBe('missing');
  await AsyncStorage.setItem(SAVE_KEY, '{broken');
  expect((await loadSaveResult()).kind).toBe('invalid');
  expect(await AsyncStorage.getItem(SAVE_KEY)).toBe('{broken');
  (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(new Error('disk'));
  expect((await loadSaveResult()).kind).toBe('io-error');
});
test('저장이 없으면 기본값', async () => {
  await expect(loadSave()).resolves.toEqual(defaultSave());
  expect(defaultSave()).toMatchObject({
    schema: 1,
    totalGrains: 0,
    rounds: 0,
    streak: {
      days: 0,
      lastDay: null,
      freezes: 0
    },
    settings: {
      haptics: true,
      sound: true
    }
  });
});
test('card answer and manual crossword solve contribute to the same goal and do not grant twice', () => {
  const now = new Date(2026, 10, 22, 12);
  const result = {
    key: 'usage:a',
    type: 'usage',
    correct: true,
    timedOut: false,
    gaveUp: false,
    synonymHit: false,
    userAnswer: '답',
    elapsedMs: 0,
    grains: 0
  };
  let d = finishCard(defaultSave(), result, now);
  expect(dailyProgress(d.activity, '2026-11-22').learned).toBe(1);
  expect(d.totalGrains).toBe(15);
  expect(finishCard(d, result, now).totalGrains).toBe(15);
  const board = {
    id: 'b',
    level: 'easy' as const,
    theme: '판',
    rows: 4,
    cols: 4,
    intro: '',
    notes: [],
    entries: [{
      num: 1,
      dir: 'across' as const,
      row: 0,
      col: 0,
      answer: '가늘다',
      clue: '뜻'
    }]
  };
  const progress = {
    solved: [0],
    revealed: {},
    helps: 0
  };
  d = finishCrosswordEntry(d, board, progress, 0, now);
  expect(dailyProgress(d.activity, '2026-11-22').learned).toBe(2);
  expect(d.totalGrains).toBe(20);
  expect(finishCrosswordEntry(d, board, progress, 0, now).totalGrains).toBe(20);
});
test('old_save_keeps_today_goal_and_records_but_does_not_invent_historical_rewards', async () => {
  const old = {
    ...defaultSave(),
    totalGrains: 500,
    daily: {
      day: localDay(new Date()),
      rounds: 1
    }
  } as Record<string, unknown>;
  delete old.activityVersion;
  delete old.activity;
  delete old.rewardLedger;
  await AsyncStorage.setItem(SAVE_KEY, JSON.stringify(old));
  const d = await loadSave();
  expect(d.totalGrains).toBe(500);
  expect(dailyProgress(d.activity, localDay(new Date())).complete).toBe(true);
  expect(d.rewardLedger).toEqual({});
});
test('깨진 저장은 기본값(예외 없음)', async () => {
  await AsyncStorage.setItem(SAVE_KEY, '{broken');
  await expect(loadSave()).resolves.toEqual(defaultSave());
  await AsyncStorage.setItem(SAVE_KEY, JSON.stringify({
    schema: 99
  }));
  await expect(loadSave()).resolves.toEqual(defaultSave());
});
test('finishRound가 낱알·판 수·연속 기록·문제 기록을 갱신하고 저장 왕복이 같다', async () => {
  const T0 = new Date(2026, 10, 19, 8, 0).getTime();
  let round = startRound([q(1), q(2)], T0);
  round = answer(round, '답1', T0);
  round = answer(round, '틀림', T0 + 1000);
  const next = finishRound(defaultSave(), round, new Date(T0 + 2000));
  expect(next.totalGrains).toBe(20);
  expect(next.rounds).toBe(1);
  expect(next.streak).toEqual({
    days: 1,
    lastDay: '2026-11-19',
    freezes: 0
  });
  expect(next.progress.stats['meaning:2'].needsReview).toBe(true);
  await writeSave(next);
  await expect(loadSave()).resolves.toEqual(next);
});
test('테스트 모드는 기본으로 꺼져 있고, 예전 저장을 읽어도 꺼져 있다', async () => {
  expect(defaultSave().settings.testMode).toBe(false);
  const old = {
    ...defaultSave(),
    settings: {
      haptics: false,
      sound: true
    }
  };
  await AsyncStorage.setItem(SAVE_KEY, JSON.stringify(old));
  const loaded = await loadSave();
  expect(loaded.settings).toEqual({
    haptics: false,
    sound: true,
    testMode: false,
    choiceMode: false,
    reminder: false,
    reminderHour: 19
  });
});
test('finishRound가 오늘 판 수를 세고, 예전 저장에는 하루 목표·도토리 기본값을 채운다', async () => {
  const T0 = new Date(2026, 10, 19, 8, 0).getTime();
  const round = answer(startRound([q(1)], T0), '답1', T0);
  const once = finishRound(defaultSave(), round, new Date(T0));
  expect(once.daily).toEqual({
    day: '2026-11-19',
    rounds: 1
  });
  expect(finishRound(once, round, new Date(T0 + 1000)).daily.rounds).toBe(2);
  const old = {
    schema: 1,
    totalGrains: 10,
    rounds: 1,
    streak: {
      days: 2,
      lastDay: '2026-11-18'
    },
    progress: {
      stats: {},
      triesByType: {}
    },
    settings: {}
  };
  await AsyncStorage.setItem(SAVE_KEY, JSON.stringify(old));
  const loaded = await loadSave();
  expect(loaded.daily).toEqual({
    day: null,
    rounds: 0
  });
  expect(loaded.streak).toEqual({
    days: 2,
    lastDay: '2026-11-18',
    freezes: 0
  });
});
test('오늘의 문제를 끝내면 그날 칸 기록을 남기고, 일반 판은 건드리지 않는다', async () => {
  const T0 = new Date(2026, 10, 19, 8, 0).getTime();
  let round = startRound([q(1), q(2)], T0, 5);
  round = answer(round, '답1', T0);
  round = answer(round, '틀림', T0 + 1000);
  const after = finishRound(defaultSave(), round, new Date(T0), 'challenge');
  expect(after.challenge).toEqual({
    day: '2026-11-19',
    marks: 'ox'
  });
  expect(after.totalGrains).toBe(20);
  expect(finishRound(after, round, new Date(T0 + 5000)).challenge).toEqual(after.challenge);
  expect(defaultSave().challenge).toEqual({
    day: null,
    marks: ''
  });
});
test('예전 저장(needsReview만)은 읽을 때 노트 형식으로 채운다', async () => {
  const D0 = new Date(2026, 10, 19, 9).getTime();
  const old = {
    ...defaultSave(),
    progress: {
      triesByType: {
        meaning: 1
      },
      stats: {
        'meaning:1': {
          seen: 1,
          correct: 0,
          lastAt: D0,
          lastWrongAt: D0,
          needsReview: true
        }
      }
    }
  };
  await AsyncStorage.setItem(SAVE_KEY, JSON.stringify(old));
  const loaded = await loadSave();
  expect(loaded.progress.stats['meaning:1']).toMatchObject({
    box: 1,
    dueDay: '2026-11-20',
    wrong: 1,
    needsReview: true
  });
});
test('⭐는 판 결과 저장 뒤에도 남는다', () => {
  const T0 = new Date(2026, 10, 19, 8, 0).getTime();
  const round = answer(startRound([q(2)], T0), '틀림', T0 + 1000);
  const next = finishRound(toggleStarSave(defaultSave(), 'meaning:2'), round, new Date(T0 + 2000));
  expect(next.progress.stats['meaning:2']).toMatchObject({
    starred: true,
    box: 1
  });
});
test('깨진 문제 기록 하나 때문에 저장 전체를 잃지 않는다', async () => {
  const D0 = new Date(2026, 10, 19, 9).getTime();
  const data = {
    ...defaultSave(),
    totalGrains: 500,
    progress: {
      triesByType: {},
      stats: {
        'meaning:1': null,
        'meaning:2': 'oops',
        'meaning:3': {
          needsReview: true,
          lastAt: D0
        },
        'meaning:4': {
          seen: 1,
          correct: 0,
          lastAt: D0,
          lastWrongAt: D0,
          needsReview: true
        }
      }
    }
  };
  await AsyncStorage.setItem(SAVE_KEY, JSON.stringify(data));
  const loaded = await loadSave();
  expect(loaded.totalGrains).toBe(500);
  expect(Object.keys(loaded.progress.stats).sort()).toEqual(['meaning:3', 'meaning:4']);
  expect(loaded.progress.stats['meaning:3']).toMatchObject({
    seen: 0,
    correct: 0,
    box: 1,
    wrong: 1
  });
  expect(loaded.progress.stats['meaning:4']).toMatchObject({
    box: 1,
    wrong: 1
  });
});
test('finishCard: 오늘 카드를 푼 날을 남기고 문제 기록만 쌓는다(판·낱알·하루 목표는 그대로)', () => {
  const now = new Date(2026, 10, 20, 9);
  const result = {
    key: 'usage:word-32',
    type: 'usage',
    correct: false,
    timedOut: false,
    gaveUp: false,
    synonymHit: false,
    userAnswer: '틀린 문장',
    elapsedMs: 0,
    grains: 0
  };
  const next = finishCard(defaultSave(), result, now);
  expect(next.card).toEqual({
    day: '2026-11-20'
  });
  expect(next.progress.stats['usage:word-32'].needsReview).toBe(true);
  expect(next).toMatchObject({
    rounds: 0,
    totalGrains: 0,
    daily: {
      day: null,
      rounds: 0
    }
  });
});
test('예전 저장(카드·알림 설정 없음)도 기본값으로 채워 읽는다', async () => {
  const old = {
    ...defaultSave(),
    settings: {
      haptics: true,
      sound: true,
      testMode: false
    }
  } as Record<string, unknown>;
  delete old.card;
  await AsyncStorage.setItem(SAVE_KEY, JSON.stringify(old));
  const loaded = await loadSave();
  expect(loaded.card).toEqual({
    day: null
  });
  expect(loaded.settings).toMatchObject({
    reminder: false,
    reminderHour: 19,
    choiceMode: false
  });
});
test('saveCrossword: 판 진행을 남기고 낱알을 더하며, 낱알을 받은 날은 연속 기록에 센다', () => {
  const now = new Date(2026, 10, 20, 9);
  const progress = {
    solved: [0],
    revealed: {},
    helps: 0
  };
  const next = saveCrossword(defaultSave(), 'cw-023', progress, 5, now);
  expect(next.crosswords['cw-023']).toEqual(progress);
  expect(next.totalGrains).toBe(5);
  expect(next.streak.lastDay).toBe('2026-11-20');
  expect(next).toMatchObject({
    rounds: 0,
    daily: {
      day: null,
      rounds: 0
    }
  });
  expect(saveCrossword(defaultSave(), 'cw-023', progress, 0, now).streak.lastDay).toBeNull();
});
test('saveCrossword: 찬스를 쓰면 줄이고, 판을 다 풀면 덤 찬스를 하나 더한다. 예전 저장은 찬스 기록을 채운다', async () => {
  const now = new Date(2026, 10, 21, 9);
  const progress = {
    solved: [],
    revealed: {},
    helps: 1,
    chosung: [0]
  };
  expect(defaultSave().chance).toEqual({
    day: null,
    bonus: 0
  });
  const used = saveCrossword(defaultSave(), 'cw-023', progress, 0, now, {
    usedChance: true
  });
  expect(used.chance).toEqual({
    day: '2026-11-21',
    bonus: 0
  });
  expect(saveCrossword(defaultSave(), 'cw-023', progress, 0, now).chance).toEqual({
    day: null,
    bonus: 0
  });
  expect(saveCrossword(used, 'cw-023', progress, 5, now, {
    completed: true
  }).chance).toEqual({
    day: '2026-11-21',
    bonus: 1
  });
  const old: Record<string, unknown> = {
    ...defaultSave()
  };
  delete old.chance;
  await AsyncStorage.setItem(SAVE_KEY, JSON.stringify(old));
  expect((await loadSave()).chance).toEqual({
    day: null,
    bonus: 0
  });
  await AsyncStorage.setItem(SAVE_KEY, JSON.stringify({
    ...defaultSave(),
    chance: {
      day: '2026-11-21',
      bonus: -2
    }
  }));
  expect((await loadSave()).chance).toEqual({
    day: '2026-11-21',
    bonus: 0
  });
});
test('깨진 퍼즐 진행만 버리고 읽는다', async () => {
  await AsyncStorage.setItem(SAVE_KEY, JSON.stringify({
    ...defaultSave(),
    crosswords: {
      a: {
        solved: [1],
        revealed: {
          '0,0': '가',
          x: 3
        },
        helps: 2
      },
      b: {
        solved: 'x'
      },
      c: null
    }
  }));
  expect((await loadSave()).crosswords).toEqual({
    a: {
      solved: [1],
      revealed: {
        '0,0': '가'
      },
      helps: 2
    }
  });
});
const made = (n: number) => ({
  id: `made-${n}`,
  level: 'easy' as const,
  theme: `조합 퍼즐 ${n}`,
  rows: 4,
  cols: 4,
  intro: '',
  notes: [],
  entries: [{
    num: 1,
    dir: 'across' as const,
    row: 0,
    col: 0,
    answer: '가늘다',
    clue: '굵기가 작다'
  }]
});
test('addMadeCrossword: 만든 판을 앞에 두고, 너무 많으면 오래된 판과 그 진행을 지운다', () => {
  let d = defaultSave();
  for (let n = 1; n <= MADE_KEEP + 2; n++) d = addMadeCrossword(d, made(n));
  d = saveCrossword(d, 'made-3', {
    solved: [0],
    revealed: {},
    helps: 0
  }, 0, new Date());
  d = {
    ...d,
    crosswords: {
      ...d.crosswords,
      'made-1': {
        solved: [],
        revealed: {},
        helps: 0
      }
    }
  };
  d = addMadeCrossword(d, made(99));
  expect(d.madeCrosswords.length).toBe(MADE_KEEP);
  expect(d.madeCrosswords[0].id).toBe('made-99');
  expect(d.madeCrosswords.some(b => b.id === 'made-3')).toBe(false);
  expect(d.crosswords['made-3']).toBeUndefined();
});
test('만든 판·초성 기록을 읽고, 깨진 판은 버린다. 예전 저장에는 빈 목록', async () => {
  await AsyncStorage.setItem(SAVE_KEY, JSON.stringify({
    ...defaultSave(),
    madeCrosswords: [made(1), {
      id: 'bad'
    }],
    crosswords: {
      'made-1': {
        solved: [],
        revealed: {},
        helps: 1,
        chosung: [0, 'x']
      }
    }
  }));
  const loaded = await loadSave();
  expect(loaded.madeCrosswords.map(b => b.id)).toEqual(['made-1']);
  expect(loaded.crosswords['made-1'].chosung).toEqual([0]);
  const old: Record<string, unknown> = {
    ...defaultSave()
  };
  delete old.madeCrosswords;
  await AsyncStorage.setItem(SAVE_KEY, JSON.stringify(old));
  expect((await loadSave()).madeCrosswords).toEqual([]);
});
