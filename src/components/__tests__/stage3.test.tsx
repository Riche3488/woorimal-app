// 오늘의 낱말 카드·곳간 낱말·학습 알림 설정 화면.
import { fireEvent, render, screen } from '@testing-library/react-native';
import * as Notifications from 'expo-notifications';
import CardScreen from '../../app/card';
import Collection from '../../app/collection';
import Settings from '../../app/settings';
import { cardOfDay } from '../../core/cards';
import { localDay } from '../../core/growth';
import { emptyProgress, notebookCounts, type Progress } from '../../core/progress';
import type { AppCard, AppPack, AppQuestion } from '../../core/types';
import { defaultSave, type SaveData } from '../../data/save';
import { GameContextProvider, type Game } from '../../state/GameProvider';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('../../data/pack-store', () => ({ loadPack: jest.fn(), refreshPack: jest.fn() }));
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: ({ children }: { children: unknown }) => children }));

const usage: AppQuestion = {
  key: 'usage:word-32', type: 'usage', kind: 'choice', prompt: '‘겉돌다’를 잘못 쓴 문장은?', answer: '동네를 겉돌며 구경했다.',
  choices: ['기름이 물에 겉돌았다.', '동네를 겉돌며 구경했다.'],
  explain: '기름이 물에 겉돌았다.: 섞이지 않는 모습으로 바른 쓰임입니다.\n동네를 겉돌며 구경했다.: 돌아다닌다는 뜻은 쏘다니다입니다.',
  source: 'original', easy: true,
};
const card: AppCard = {
  key: 'card:word-32', word: '겉돌다', title: '겉돌다: 어울리지 못할 때', pos: '동사', meaning: '따로 움직이다.',
  explain: '두 쓰임을 연습합니다.', tip: '동사입니다.', examples: ['대화가 겉돌았다.'], question: 'usage:word-32',
};
const word = (n: number, answer: string): AppQuestion => ({ key: `meaning:${n}`, type: 'meaning', kind: 'typed', prompt: '뜻', answer, explain: `${answer} · 명사`, source: 'original', easy: true });
const questions = [usage, word(1, '난방기'), word(2, '가늘다')];

function game(over: Partial<SaveData> = {}, extra: Partial<Game> = {}): Game {
  const save = { ...defaultSave(), ...over };
  return {
    pack: { questions, cards: [card] } as unknown as AppPack, save,
    counts: notebookCounts(save.progress, questions, localDay(new Date())),
    lastRound: null, lastMode: 'normal', previousSave: null, lastPracticeType: null,
    startNormal: jest.fn(), startReview: jest.fn(), startStarred: jest.fn(), startPractice: jest.fn(), startChallenge: jest.fn(),
    toggleStar: jest.fn(), complete: jest.fn(), answerCard: jest.fn(), updateCrossword: jest.fn(), updateSettings: jest.fn(), resetRecords: jest.fn(), ...extra,
  };
}
const show = (el: React.ReactElement, g: Game) => render(<GameContextProvider value={g}>{el}</GameContextProvider>);

describe('오늘의 낱말', () => {
  test('카드를 보여 주고, 보기를 고르면 기록하고 보기마다 이유를 보인다', async () => {
    const answerCard = jest.fn();
    expect(cardOfDay([card], localDay(new Date()))).toBe(card);
    await show(<CardScreen />, game({}, { answerCard }));
    expect(screen.getByText('겉돌다')).toBeTruthy();
    expect(screen.getByText('“대화가 겉돌았다.”')).toBeTruthy();
    expect(screen.queryByText('섞이지 않는 모습으로 바른 쓰임입니다.')).toBeNull();
    await fireEvent.press(screen.getByText('기름이 물에 겉돌았다.'));
    expect(answerCard).toHaveBeenCalledWith(expect.objectContaining({ key: 'usage:word-32', correct: false, userAnswer: '기름이 물에 겉돌았다.' }));
    expect(screen.getByText('섞이지 않는 모습으로 바른 쓰임입니다.')).toBeTruthy();
    expect(screen.getByText('오답노트에 담았어요. 내일 다시 풀어 봐요')).toBeTruthy();
  });
  test('오늘 이미 풀었으면 정답과 이유를 펼쳐 두고 다시 기록하지 않는다', async () => {
    const answerCard = jest.fn();
    await show(<CardScreen />, game({ card: { day: localDay(new Date()) } }, { answerCard }));
    expect(screen.getByText('오늘 낱말은 이미 풀었어요')).toBeTruthy();
    expect(screen.getByText('돌아다닌다는 뜻은 쏘다니다입니다.')).toBeTruthy();
    await fireEvent.press(screen.getByText('✓ 동네를 겉돌며 구경했다.'));
    expect(answerCard).not.toHaveBeenCalled();
  });
});

test('곳간 낱말: 외운 낱말을 보이고 누르면 해설', async () => {
  const stat = { seen: 3, correct: 3, lastAt: 1, needsReview: false, box: 0 as const, dueDay: null, wrong: 1, mastered: true };
  const progress: Progress = { ...emptyProgress(), stats: { 'meaning:1': stat } };
  await show(<Collection />, game({ progress }));
  expect(screen.getByText('외운 낱말')).toBeTruthy();
  await fireEvent.press(screen.getByText('난방기'));
  expect(screen.getByText('난방기 · 명사')).toBeTruthy();
  expect(screen.queryByText('가늘다')).toBeNull();
});

describe('학습 알림 설정', () => {
  test('켜면 권한을 묻고, 허용하면 켠다. 켜져 있으면 시각을 고른다', async () => {
    const updateSettings = jest.fn();
    await show(<Settings />, game({}, { updateSettings }));
    await fireEvent(screen.getByLabelText('학습 알림'), 'valueChange', true);
    expect(Notifications.getPermissionsAsync).toHaveBeenCalled();
    expect(updateSettings).toHaveBeenCalledWith({ reminder: true });
  });
  test('권한을 거절하면 켜지 않는다', async () => {
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValueOnce({ granted: false, canAskAgain: false });
    const updateSettings = jest.fn();
    await show(<Settings />, game({}, { updateSettings }));
    await fireEvent(screen.getByLabelText('학습 알림'), 'valueChange', true);
    expect(updateSettings).not.toHaveBeenCalled();
  });
  test('시각 고르기', async () => {
    const updateSettings = jest.fn();
    await show(<Settings />, game({ settings: { ...defaultSave().settings, reminder: true } }, { updateSettings }));
    await fireEvent.press(screen.getByText('오전 8시'));
    expect(updateSettings).toHaveBeenCalledWith({ reminderHour: 8 });
  });
});
