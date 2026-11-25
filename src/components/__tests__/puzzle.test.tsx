// 가로세로 퍼즐 목록·한 판 화면.
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import Puzzle from '../../app/puzzle';
import Puzzles from '../../app/puzzles';
import { emptyCrossword, type CrosswordProgress } from '../../core/crossword';
import type { AppCrossword, AppPack } from '../../core/types';
import { defaultSave } from '../../data/save';
import { localDay } from '../../core/growth';
import { GameContextProvider, type Game } from '../../state/GameProvider';
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('../../data/pack-store', () => ({
  loadPack: jest.fn(),
  refreshPack: jest.fn()
}));
const mockPush = jest.fn();
let mockId = 'cw-023';
jest.mock('expo-router', () => ({
  router: {
    push: (...a: unknown[]) => mockPush(...a),
    back: jest.fn()
  },
  useLocalSearchParams: () => ({
    id: mockId
  })
}));
beforeEach(() => {
  mockId = 'cw-023';
  mockPush.mockClear();
});
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({
    children
  }: {
    children: unknown;
  }) => children
}));
jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(async () => {}),
  NotificationFeedbackType: {
    Success: 's'
  }
}));
const board: AppCrossword = {
  id: 'cw-023',
  level: 'easy',
  theme: '학교에서 보내는 하루',
  rows: 5,
  cols: 6,
  intro: '장소와 물건을 구별해요',
  notes: [{
    title: '알림장',
    text: '알릴 내용을 적은 글'
  }],
  entries: [{
    num: 1,
    dir: 'across',
    row: 0,
    col: 2,
    answer: '운동화',
    clue: '달리기 편한 신'
  }, {
    num: 1,
    dir: 'down',
    row: 0,
    col: 2,
    answer: '운동장',
    clue: '넓은 마당'
  }, {
    num: 2,
    dir: 'across',
    row: 2,
    col: 2,
    answer: '장화',
    clue: '목이 긴 신'
  }]
};
const made: AppCrossword = {
  ...board,
  id: 'made-1',
  theme: '조합 퍼즐 1',
  intro: '여러 문제를 엮었어요',
  notes: []
};
function game(crosswords: Record<string, CrosswordProgress> = {}, updateCrossword = jest.fn(), extra: Partial<Game> = {}, madeCrosswords: AppCrossword[] = []): Game {
  const save = {
    ...defaultSave(),
    crosswords,
    madeCrosswords
  };
  return {
    pack: {
      questions: [],
      crosswords: [board]
    } as unknown as AppPack,
    save,
    counts: {
      review: 0,
      due: 0,
      starred: 0,
      mastered: 0
    },
    lastRound: null,
    lastMode: 'normal',
    previousSave: null,
    lastPracticeType: null,
    toggleStar: jest.fn(),
    answerCard: jest.fn(),
    updateCrossword,
    makePuzzle: jest.fn(async () => 'made-2'),
    updateSettings: jest.fn(),
    resetRecords: jest.fn(),
    ...extra
  };
}
const show = (el: React.ReactElement, g: Game) => render(<GameContextProvider value={g}>{el}</GameContextProvider>);
test('목록: 주제·난이도·진행을 보이고 누르면 그 판으로', async () => {
  await show(<Puzzles />, game({
    'cw-023': {
      solved: [0],
      revealed: {},
      helps: 0
    }
  }));
  expect(screen.getByText('학교에서 보내는 하루')).toBeTruthy();
  expect(screen.getByText('쉬움 · 5×6 · 낱말 3개')).toBeTruthy();
  expect(screen.getByText('1/3')).toBeTruthy();
  await fireEvent.press(screen.getByText('학교에서 보내는 하루'));
  expect(mockPush).toHaveBeenCalledWith({
    pathname: '/puzzle',
    params: {
      id: 'cw-023'
    }
  });
});
describe('한 판', () => {
  test('failed_final_entry_save_keeps_input_and_never_confirms_grains_or_bonus', async () => {
    let reject!: (error: Error) => void;
    const update = jest.fn().mockImplementationOnce(() => new Promise((_resolve, fail) => {
      reject = fail;
    })).mockResolvedValue(defaultSave());
    await show(<Puzzle />, game({
      'cw-023': {
        solved: [0, 1],
        revealed: {},
        helps: 0
      }
    }, update));
    await fireEvent.changeText(screen.getByLabelText('낱말 입력'), '장화');
    await fireEvent.press(screen.getByText('확인'));
    expect(screen.queryByText('초성 보기 찬스를 하나 더 받았어요')).toBeNull();
    expect(screen.queryByText(/정답! \+/)).toBeNull();
    expect(screen.getByLabelText('낱말 입력').props.value).toBe('장화');
    await act(async () => {
      reject(new Error('disk'));
    });
    expect(screen.queryByText('초성 보기 찬스를 하나 더 받았어요')).toBeNull();
    await fireEvent.press(screen.getByText('다시 저장'));
    expect(update.mock.calls[1]).toEqual(update.mock.calls[0]);
    expect(screen.getByText('초성 보기 찬스를 하나 더 받았어요')).toBeTruthy();
  });
  test('맞히면 진행과 낱알 5개를 저장한다', async () => {
    const update = jest.fn();
    await show(<Puzzle />, game({}, update));
    expect(screen.getAllByText('달리기 편한 신').length).toBeGreaterThan(0);
    await fireEvent.changeText(screen.getByLabelText('낱말 입력'), '운동화');
    await fireEvent.press(screen.getByText('확인'));
    expect(update).toHaveBeenCalledWith('cw-023', {
      solved: [0],
      revealed: {},
      helps: 0
    }, 5, {
      entryIndex: 0,
      submittedAt: expect.any(Number)
    });
  });
  test('틀리면 저장하지 않고 다시 생각해 보라고 한다', async () => {
    const update = jest.fn();
    await show(<Puzzle />, game({}, update));
    await fireEvent.changeText(screen.getByLabelText('낱말 입력'), '운동장');
    await fireEvent.press(screen.getByText('확인'));
    expect(update).not.toHaveBeenCalled();
    expect(screen.getByText('다시 생각해 봐요')).toBeTruthy();
  });
  test('엇갈리는 낱말로 채워진 칸은 입력 모양으로 보이고, 글자 보기는 없다', async () => {
    await show(<Puzzle />, game({
      'cw-023': {
        solved: [1],
        revealed: {},
        helps: 0
      }
    }));
    expect(screen.getByLabelText('채워진 글자 운○○')).toBeTruthy();
    expect(screen.queryByText('글자 보기')).toBeNull();
  });
  test('겹치는 칸을 다시 누르면 방향이 바뀐다', async () => {
    await show(<Puzzle />, game());
    await fireEvent.press(screen.getByLabelText('1행 3열'));
    expect(screen.getByText('1 세로 · 3글자')).toBeTruthy();
  });
  test('다 풀면 학습 안내를 보인다', async () => {
    await show(<Puzzle />, game({
      'cw-023': {
        solved: [0, 1, 2],
        revealed: {},
        helps: 2
      }
    }));
    expect(screen.getByText('다 풀었어요!')).toBeTruthy();
    expect(screen.getByText('낱말 3개 · 힌트 2번')).toBeTruthy();
    expect(screen.getByText('알릴 내용을 적은 글')).toBeTruthy();
    expect(emptyCrossword()).toEqual({
      solved: [],
      revealed: {},
      helps: 0
    });
  });
});
describe('초성 보기 찬스(하루 한 번)', () => {
  test('누르면 초성을 저장하고 오늘 찬스를 쓴다', async () => {
    const update = jest.fn();
    await show(<Puzzle />, game({}, update));
    await fireEvent.press(screen.getByText('초성 보기 찬스'));
    expect(update).toHaveBeenCalledWith('cw-023', {
      solved: [],
      revealed: {},
      helps: 1,
      chosung: [0]
    }, 0, {
      usedChance: true,
      submittedAt: expect.any(Number)
    });
  });
  test('오늘 찬스를 썼으면 누를 수 없고 내일 다시 쓸 수 있다고 알린다', async () => {
    const update = jest.fn();
    const g = game({}, update);
    g.save = {
      ...g.save,
      chance: {
        day: localDay(new Date()),
        bonus: 0
      }
    };
    await show(<Puzzle />, g);
    expect(screen.queryByText('초성 보기 찬스')).toBeNull();
    expect(screen.getByText('찬스는 내일 다시')).toBeTruthy();
  });
  test('판을 다 풀어 모은 덤 찬스가 있으면 오늘 몫을 써도 쓸 수 있고, 남은 수를 보인다', async () => {
    const g = game();
    g.save = {
      ...g.save,
      chance: {
        day: localDay(new Date()),
        bonus: 1
      }
    };
    await show(<Puzzle />, g);
    expect(screen.getByText('초성 보기 찬스')).toBeTruthy();
    const g2 = game();
    g2.save = {
      ...g2.save,
      chance: {
        day: null,
        bonus: 2
      }
    };
    await show(<Puzzle />, g2);
    expect(screen.getByText('초성 보기 찬스 ×3')).toBeTruthy();
  });
  test('마지막 낱말을 맞혀 판을 다 풀면 찬스를 하나 더 받는다', async () => {
    const update = jest.fn();
    await show(<Puzzle />, game({
      'cw-023': {
        solved: [0, 1],
        revealed: {},
        helps: 0
      }
    }, update));
    await fireEvent.changeText(screen.getByLabelText('낱말 입력'), '장화');
    await fireEvent.press(screen.getByText('확인'));
    expect(update).toHaveBeenCalledWith('cw-023', {
      solved: [0, 1, 2],
      revealed: {},
      helps: 0
    }, 5, {
      completed: true,
      entryIndex: 2,
      submittedAt: expect.any(Number)
    });
    expect(screen.getByText('초성 보기 찬스를 하나 더 받았어요')).toBeTruthy();
  });
  test('덤 찬스가 3개 가득이면 다 풀어도 더 받지 못했다고 알린다', async () => {
    const g = game({
      'cw-023': {
        solved: [0, 1],
        revealed: {},
        helps: 0
      }
    });
    g.save = {
      ...g.save,
      chance: {
        day: null,
        bonus: 3
      }
    };
    await show(<Puzzle />, g);
    await fireEvent.changeText(screen.getByLabelText('낱말 입력'), '장화');
    await fireEvent.press(screen.getByText('확인'));
    expect(screen.getByText('찬스는 3개까지 모을 수 있어요')).toBeTruthy();
  });
  test('초성을 본 낱말은 초성 모양으로 보이고, 맞히면 낱알 3개', async () => {
    const update = jest.fn();
    await show(<Puzzle />, game({
      'cw-023': {
        solved: [],
        revealed: {},
        helps: 1,
        chosung: [0]
      }
    }, update));
    expect(screen.getByLabelText('채워진 글자 ㅇㄷㅎ')).toBeTruthy();
    expect(screen.queryByText('초성 보기')).toBeNull();
    await fireEvent.changeText(screen.getByLabelText('낱말 입력'), '운동화');
    await fireEvent.press(screen.getByText('확인'));
    expect(update).toHaveBeenCalledWith('cw-023', {
      solved: [0],
      revealed: {},
      helps: 1,
      chosung: [0]
    }, 3, {
      entryIndex: 0,
      submittedAt: expect.any(Number)
    });
  });
});
describe('조합 퍼즐', () => {
  test('목록에 만든 판이 보이고, 새 판을 만들면 그 판으로 간다', async () => {
    const makePuzzle = jest.fn(async () => 'made-2');
    await show(<Puzzles />, game({}, jest.fn(), {
      makePuzzle
    }, [made]));
    expect(screen.getByText('조합 퍼즐 1')).toBeTruthy();
    await fireEvent.press(screen.getByText('쉬움 새 판'));
    expect(makePuzzle).toHaveBeenCalledWith('easy');
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/puzzle',
      params: {
        id: 'made-2'
      }
    });
    await fireEvent.press(screen.getByText('보통 새 판'));
    expect(makePuzzle).toHaveBeenCalledWith('normal');
  });
  test('새 판은 저장이 끝난 뒤에 연다(저장 전에 열면 퍼즐을 찾을 수 없다)', async () => {
    let finish!: (id: string | null) => void;
    const makePuzzle = jest.fn(() => new Promise<string | null>(resolve => {
      finish = resolve;
    }));
    await show(<Puzzles />, game({}, jest.fn(), {
      makePuzzle
    }));
    await fireEvent.press(screen.getByText('쉬움 새 판'));
    await fireEvent.press(screen.getByText('쉬움 새 판'));
    expect(makePuzzle).toHaveBeenCalledTimes(1);
    expect(mockPush).not.toHaveBeenCalled();
    await act(async () => {
      finish('made-2');
    });
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/puzzle',
      params: {
        id: 'made-2'
      }
    });
  });
  test('못 만들면 알린다', async () => {
    await show(<Puzzles />, game({}, jest.fn(), {
      makePuzzle: jest.fn(async () => null)
    }));
    await fireEvent.press(screen.getByText('쉬움 새 판'));
    expect(mockPush).not.toHaveBeenCalled();
    expect(screen.getByText('지금은 판을 만들 수 없어요')).toBeTruthy();
  });
  test('만든 판도 열어서 풀 수 있다', async () => {
    mockId = 'made-1';
    const update = jest.fn();
    await show(<Puzzle />, game({}, update, {}, [made]));
    expect(screen.getByText('조합 퍼즐 1')).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText('낱말 입력'), '운동화');
    await fireEvent.press(screen.getByText('확인'));
    expect(update).toHaveBeenCalledWith('made-1', {
      solved: [0],
      revealed: {},
      helps: 0
    }, 5, {
      entryIndex: 0,
      submittedAt: expect.any(Number)
    });
  });
});
