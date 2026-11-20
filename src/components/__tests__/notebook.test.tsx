import { fireEvent, render, screen } from '@testing-library/react-native';
import Notebook from '../../app/notebook';
import { localDay } from '../../core/growth';
import { emptyProgress, notebookCounts, recordResults, toggleStar, type Progress } from '../../core/progress';
import type { RoundResult } from '../../core/round';
import type { AppPack, AppQuestion } from '../../core/types';
import { defaultSave } from '../../data/save';
import { GameContextProvider, type Game } from '../../state/GameProvider';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('../../data/pack-store', () => ({ loadPack: jest.fn(), refreshPack: jest.fn() }));

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ router: { push: (...a: unknown[]) => mockPush(...a), back: jest.fn() } }));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: ({ children }: { children: unknown }) => children }));

const DAY = 86_400_000;
const q = (n: number): AppQuestion => ({
  key: `meaning:${n}`, type: 'meaning', kind: 'typed', prompt: `문제${n}`, answer: `정답${n}`, explain: `해설${n}`, source: 'original', easy: true,
});
const questions = [q(1), q(2), q(3)];
const res = (n: number, correct: boolean, extra: Partial<RoundResult> = {}): RoundResult => ({
  key: `meaning:${n}`, type: 'meaning', correct, timedOut: false, gaveUp: false, synonymHit: false,
  userAnswer: '엉뚱한 답', elapsedMs: 1000, grains: 0, ...extra,
});

function game(progress: Progress, toggleStarFn = jest.fn()): Game {
  const save = { ...defaultSave(), progress };
  return {
    pack: { questions } as unknown as AppPack, save,
    counts: notebookCounts(progress, questions, localDay(new Date())),
    lastRound: null, lastMode: 'normal', previousSave: null, lastPracticeType: null,
    startNormal: jest.fn(), startReview: jest.fn(), startStarred: jest.fn(), startPractice: jest.fn(), startChallenge: jest.fn(),
    toggleStar: toggleStarFn, complete: jest.fn(), answerCard: jest.fn(), updateSettings: jest.fn(), resetRecords: jest.fn(),
  };
}

// 1: 이틀 전 틀림(오늘 복습), 2: 오늘 모르겠어요(내일 복습), 3: ⭐만
const sample = () => {
  const now = Date.now();
  let p = recordResults(emptyProgress(), [res(1, false), res(1, false)], now - 2 * DAY);
  p = recordResults(p, [res(2, false, { gaveUp: true, userAnswer: '' })], now);
  return toggleStar(p, 'meaning:3');
};
const show = (p: Progress, fn?: jest.Mock) => render(<GameContextProvider value={game(p, fn)}><Notebook /></GameContextProvider>);

beforeEach(() => mockPush.mockClear());

test('탭 세 개에 수가 보인다', async () => {
  await show(sample());
  expect(screen.getByText('복습할 문제 2')).toBeTruthy();
  expect(screen.getByText('⭐ 담은 문제 1')).toBeTruthy();
  expect(screen.getByText('외운 문제 0')).toBeTruthy();
});

test('복습 탭: 오늘 복습 문제가 먼저, 오늘 복습·1일 뒤 표시', async () => {
  await show(sample());
  const prompts = screen.getAllByText(/^문제\d$/).map(n => n.props.children);
  expect(prompts).toEqual(['문제1', '문제2']);
  expect(screen.getByText(/오늘 복습/)).toBeTruthy();
  expect(screen.getByText(/1일 뒤/)).toBeTruthy();
});

test('행을 누르면 정답·내 답·틀린 횟수·해설이 펼쳐진다', async () => {
  await show(sample());
  expect(screen.queryByText('정답: 정답1')).toBeNull();
  await fireEvent.press(screen.getByText('문제1'));
  expect(screen.getByText('정답: 정답1')).toBeTruthy();
  expect(screen.getByText('내 답: 엉뚱한 답 · 틀린 횟수 2')).toBeTruthy();
  expect(screen.getByText('해설1')).toBeTruthy();
  await fireEvent.press(screen.getByText('문제2'));
  expect(screen.getByText('내 답: 모르겠어요 · 틀린 횟수 1')).toBeTruthy();
});

test('복습 풀기는 review, ⭐ 탭에서는 ⭐ 풀기 → starred', async () => {
  await show(sample());
  await fireEvent.press(screen.getByText('▶ 복습 풀기 (오늘 1)'));
  expect(mockPush).toHaveBeenLastCalledWith({ pathname: '/play', params: { mode: 'review' } });
  await fireEvent.press(screen.getByText('⭐ 담은 문제 1'));
  await fireEvent.press(screen.getByText('▶ ⭐ 풀기'));
  expect(mockPush).toHaveBeenLastCalledWith({ pathname: '/play', params: { mode: 'starred' } });
});

test('빈 탭 안내, 풀 문제가 없으면 풀기 버튼이 눌리지 않는다', async () => {
  await show(emptyProgress());
  expect(screen.getByText('틀린 문제가 여기에 모여요')).toBeTruthy();
  await fireEvent.press(screen.getByText('▶ 복습 풀기 (오늘 0)'));
  expect(mockPush).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByText('⭐ 담은 문제 0'));
  expect(screen.getByText('문제를 풀다가 ⭐를 눌러 담아 보세요')).toBeTruthy();
  await fireEvent.press(screen.getByText('외운 문제 0'));
  expect(screen.getByText('세 번 맞힌 문제가 여기에 모여요')).toBeTruthy();
});

test('행의 별을 누르면 toggleStar(key)', async () => {
  const fn = jest.fn();
  await show(sample(), fn);
  await fireEvent.press(screen.getAllByLabelText('담기')[0]);
  expect(fn).toHaveBeenCalledWith('meaning:1');
});
