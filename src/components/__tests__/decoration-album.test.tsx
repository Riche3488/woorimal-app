import { fireEvent, render, screen } from '@testing-library/react-native';
import type { AppPack } from '../../core/types';
import type { DecorationId } from '../../core/decorations';
import { defaultSave, type SaveData } from '../../data/save';
import { GameContextProvider, type Game } from '../../state/GameProvider';
import { DecorationAlbum } from '../DecorationAlbum';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('../../data/pack-store', () => ({ loadPack: jest.fn(), refreshPack: jest.fn() }));

function game(save: SaveData, extra: Partial<Game> = {}): Game {
  return {
    pack: { questions: [] } as unknown as AppPack, save,
    counts: { review: 0, due: 0, starred: 0, mastered: 0 },
    lastRound: null, lastMode: 'normal', previousSave: null, lastPracticeType: null,
    toggleStar: jest.fn(), answerCard: jest.fn(), updateCrossword: jest.fn(), makePuzzle: jest.fn(), updateSettings: jest.fn(), resetRecords: jest.fn(),
    ...extra,
  };
}
const saveWith = (unlocked: DecorationId[], equipped: (DecorationId | null)[], seen: DecorationId[] = unlocked): SaveData => {
  const s = defaultSave();
  return { ...s, rounds: 2, decorations: { unlocked, equipped, seen } };
};

test('shows_collection_count_new_badge_and_locked_progress_then_marks_seen', async () => {
  const markDecorationsSeen = jest.fn();
  await render(<GameContextProvider value={game(saveWith(['leaf-flag', 'kite'], [null, null, null], ['leaf-flag']), { markDecorationsSeen })}><DecorationAlbum /></GameContextProvider>);
  expect(screen.getByText('2/12')).toBeTruthy();
  expect(screen.getByLabelText(/방패연, 흔함, 눌러서 놓기, 새로 얻음/)).toBeTruthy();
  expect(screen.getByLabelText('잠긴 장식, 흔함, 퀴즈 5판 풀기 2/5')).toBeTruthy();
  expect(markDecorationsSeen).toHaveBeenCalledTimes(1);
});

test('full_slots_show_hint_instead_of_equipping', async () => {
  const equipDecoration = jest.fn(), unequipDecoration = jest.fn();
  await render(<GameContextProvider value={game(saveWith(['leaf-flag', 'word-sign', 'kite', 'magpie'], ['leaf-flag', 'word-sign', 'kite']), { equipDecoration, unequipDecoration })}><DecorationAlbum /></GameContextProvider>);
  await fireEvent.press(screen.getByLabelText(/^까치/));
  expect(equipDecoration).not.toHaveBeenCalled();
  expect(screen.getByText(/자리가 꽉 찼어요/)).toBeTruthy();
  await fireEvent.press(screen.getByLabelText(/^방패연/));
  // 곳간에 있는 장식을 누르면 '빼기'를 요청한다(뒤집기 아님).
  expect(unequipDecoration).toHaveBeenCalledWith('kite');
  expect(equipDecoration).not.toHaveBeenCalled();
});
