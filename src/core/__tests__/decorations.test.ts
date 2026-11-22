import { evaluateUnlocks, equipDecoration, syncDecorations } from '../decorations';
import { defaultSave } from '../../data/save';
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
test('first_goal_unlocks_once_and_cannot_equip_locked_item', () => {
  const save = defaultSave();
  expect(equipDecoration(save, 'leaf-flag')).toBe(save);
  const unlocked = syncDecorations({
    ...save,
    activity: {
      '2026-11-22': {
        day: '2026-11-22',
        contentIds: ['1', '2', '3', '4', '5'],
        migratedComplete: false
      }
    }
  });
  expect(evaluateUnlocks(unlocked)).toEqual(['leaf-flag']);
  expect(syncDecorations(unlocked).decorations.unlocked).toEqual(['leaf-flag']);
  expect(equipDecoration(unlocked, 'leaf-flag').decorations.equipped).toBe('leaf-flag');
});
test('ten_discoveries_and_five_mastered_words_unlock_distinct_items_for_existing_user', () => {
  const discoveries = Object.fromEntries(Array.from({
    length: 10
  }, (_, i) => [String(i), {
    word: `낱말${i}`,
    at: 1,
    ...(i < 5 ? {
      masteredAt: 2
    } : {})
  }]));
  expect(evaluateUnlocks({
    ...defaultSave(),
    discoveries
  })).toEqual(['word-sign', 'acorn-basket']);
});
