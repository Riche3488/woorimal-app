// 가로세로 퍼즐 목록·한 판 화면.
import { fireEvent, render, screen } from '@testing-library/react-native';
import Puzzle from '../../app/puzzle';
import Puzzles from '../../app/puzzles';
import { emptyCrossword, type CrosswordProgress } from '../../core/crossword';
import type { AppCrossword, AppPack } from '../../core/types';
import { defaultSave } from '../../data/save';
import { GameContextProvider, type Game } from '../../state/GameProvider';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('../../data/pack-store', () => ({ loadPack: jest.fn(), refreshPack: jest.fn() }));
const mockPush = jest.fn();
jest.mock('expo-router', () => ({ router: { push: (...a: unknown[]) => mockPush(...a), back: jest.fn() }, useLocalSearchParams: () => ({ id: 'cw-023' }) }));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: ({ children }: { children: unknown }) => children }));
jest.mock('expo-haptics', () => ({ notificationAsync: jest.fn(async () => {}), NotificationFeedbackType: { Success: 's' } }));

const board: AppCrossword = {
  id: 'cw-023', level: 'easy', theme: '학교에서 보내는 하루', rows: 5, cols: 6, intro: '장소와 물건을 구별해요', notes: [{ title: '알림장', text: '알릴 내용을 적은 글' }],
  entries: [
    { num: 1, dir: 'across', row: 0, col: 2, answer: '운동화', clue: '달리기 편한 신' },
    { num: 1, dir: 'down', row: 0, col: 2, answer: '운동장', clue: '넓은 마당' },
    { num: 2, dir: 'across', row: 2, col: 2, answer: '장화', clue: '목이 긴 신' },
  ],
};

function game(crosswords: Record<string, CrosswordProgress> = {}, updateCrossword = jest.fn()): Game {
  const save = { ...defaultSave(), crosswords };
  return {
    pack: { questions: [], crosswords: [board] } as unknown as AppPack, save, counts: { review: 0, due: 0, starred: 0, mastered: 0 },
    lastRound: null, lastMode: 'normal', previousSave: null, lastPracticeType: null,
    startNormal: jest.fn(), startReview: jest.fn(), startStarred: jest.fn(), startPractice: jest.fn(), startChallenge: jest.fn(),
    toggleStar: jest.fn(), complete: jest.fn(), answerCard: jest.fn(), updateCrossword, updateSettings: jest.fn(), resetRecords: jest.fn(),
  };
}
const show = (el: React.ReactElement, g: Game) => render(<GameContextProvider value={g}>{el}</GameContextProvider>);

test('목록: 주제·난이도·진행을 보이고 누르면 그 판으로', async () => {
  await show(<Puzzles />, game({ 'cw-023': { solved: [0], revealed: {}, helps: 0 } }));
  expect(screen.getByText('학교에서 보내는 하루')).toBeTruthy();
  expect(screen.getByText('쉬움 · 5×6 · 낱말 3개')).toBeTruthy();
  expect(screen.getByText('1/3')).toBeTruthy();
  await fireEvent.press(screen.getByText('학교에서 보내는 하루'));
  expect(mockPush).toHaveBeenCalledWith({ pathname: '/puzzle', params: { id: 'cw-023' } });
});

describe('한 판', () => {
  test('맞히면 진행과 낱알 5개를 저장한다', async () => {
    const update = jest.fn();
    await show(<Puzzle />, game({}, update));
    expect(screen.getAllByText('달리기 편한 신').length).toBeGreaterThan(0);
    await fireEvent.changeText(screen.getByLabelText('낱말 입력'), '운동화');
    await fireEvent.press(screen.getByText('확인'));
    expect(update).toHaveBeenCalledWith('cw-023', { solved: [0], revealed: {}, helps: 0 }, 5);
  });
  test('틀리면 저장하지 않고 다시 생각해 보라고 한다', async () => {
    const update = jest.fn();
    await show(<Puzzle />, game({}, update));
    await fireEvent.changeText(screen.getByLabelText('낱말 입력'), '운동장');
    await fireEvent.press(screen.getByText('확인'));
    expect(update).not.toHaveBeenCalled();
    expect(screen.getByText('다시 생각해 봐요')).toBeTruthy();
  });
  test('엇갈리는 낱말로 채워진 칸은 입력 모양으로 보이고, 글자 보기는 도움으로 센다', async () => {
    const update = jest.fn();
    await show(<Puzzle />, game({ 'cw-023': { solved: [1], revealed: {}, helps: 0 } }, update));
    expect(screen.getByLabelText('채워진 글자 운○○')).toBeTruthy();
    await fireEvent.press(screen.getByText('글자 보기'));
    expect(update).toHaveBeenCalledWith('cw-023', { solved: [1], revealed: { '0,3': '동' }, helps: 1 }, 0);
  });
  test('겹치는 칸을 다시 누르면 방향이 바뀐다', async () => {
    await show(<Puzzle />, game());
    await fireEvent.press(screen.getByLabelText('1행 3열'));
    expect(screen.getByText('1 세로 · 3글자')).toBeTruthy();
  });
  test('다 풀면 학습 안내를 보인다', async () => {
    await show(<Puzzle />, game({ 'cw-023': { solved: [0, 1, 2], revealed: {}, helps: 2 } }));
    expect(screen.getByText('다 풀었어요!')).toBeTruthy();
    expect(screen.getByText('낱말 3개 · 글자 보기 2번')).toBeTruthy();
    expect(screen.getByText('알릴 내용을 적은 글')).toBeTruthy();
    expect(emptyCrossword()).toEqual({ solved: [], revealed: {}, helps: 0 });
  });
});
