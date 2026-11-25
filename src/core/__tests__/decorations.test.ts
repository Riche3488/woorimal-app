import { DECORATIONS, SLOTS, decorationProgress, evaluateUnlocks, equipDecoration, markDecorationsSeen, newDecorations, syncDecorations, unequipAll, unequipDecoration, type DecorationId } from '../decorations';
import { defaultSave, type SaveData } from '../../data/save';
import { readLearningState } from '../../data/save-activity';
import { xpForLevel } from '../growth';
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
const withUnlocked = (ids: DecorationId[]): SaveData => {
  const s = defaultSave();
  return { ...s, decorations: { ...s.decorations, unlocked: ids } };
};
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
  expect(equipDecoration(unlocked, 'leaf-flag').decorations.equipped).toEqual(['leaf-flag', null, null]);
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
test('catalog_has_twelve_items_in_three_rarities', () => {
  const ids = Object.keys(DECORATIONS);
  expect(ids).toHaveLength(12);
  expect(new Set(ids.map(id => DECORATIONS[id as DecorationId].rarity))).toEqual(new Set(['common', 'rare', 'epic']));
});
test('new_conditions_unlock_from_existing_records', () => {
  const s = defaultSave();
  const save: SaveData = {
    ...s,
    rounds: 5,
    streak: { ...s.streak, days: 7, lastDay: '2026-11-25' },
    totalGrains: xpForLevel(12),
    crosswords: { a: { solved: [1, 2, 3, 4, 5, 6], revealed: {}, helps: 0 }, b: { solved: [1, 2, 3, 4], revealed: {}, helps: 0 } },
    challengeHistory: Object.fromEntries(Array.from({ length: 7 }, (_, i) => [`2026-11-0${i + 1}`, 'oxo']))
  };
  expect(evaluateUnlocks(save, '2026-11-25')).toEqual(expect.arrayContaining(['scarecrow', 'clay-jars', 'kite', 'stone-lantern', 'persimmon-tree', 'magpie', 'watermill']));
  expect(evaluateUnlocks(save, '2026-11-25')).not.toContain('golden-gourd');
  // 이미 끊긴 연속 기록(저장 값만 7)으로는 연속 장식을 주지 않는다.
  expect(evaluateUnlocks(save, '2026-11-30')).not.toContain('stone-lantern');
  // 같은 낱말을 두 번 센 퍼즐 기록은 한 번만 센다.
  expect(decorationProgress({ ...s, crosswords: { a: { solved: [1, 1, 1, 2], revealed: {}, helps: 0 } } }, 'kite').current).toBe(2);
});
test('progress_reports_current_toward_target_and_caps_at_target', () => {
  const s = defaultSave();
  expect(decorationProgress({ ...s, rounds: 3 }, 'scarecrow')).toEqual({ current: 3, target: 5, done: false });
  expect(decorationProgress({ ...s, rounds: 9 }, 'scarecrow')).toEqual({ current: 5, target: 5, done: true });
  // 한 번 얻은 장식은 연속 기록이 끊겨도 다 모은 것으로 보인다.
  expect(decorationProgress(withUnlocked(['stone-lantern']), 'stone-lantern').done).toBe(true);
});
test('equip_fills_free_slots_is_idempotent_and_refuses_when_full', () => {
  let save = withUnlocked(['leaf-flag', 'word-sign', 'kite', 'magpie']);
  save = equipDecoration(save, 'leaf-flag');
  save = equipDecoration(save, 'word-sign');
  save = equipDecoration(save, 'kite');
  expect(save.decorations.equipped).toEqual(['leaf-flag', 'word-sign', 'kite']);
  expect(SLOTS).toBe(3);
  expect(equipDecoration(save, 'magpie')).toBe(save);
  // 두 번 눌러도 놓은 장식이 빠지지 않는다.
  expect(equipDecoration(save, 'kite')).toBe(save);
  expect(unequipDecoration(save, 'magpie')).toBe(save);
  save = unequipDecoration(save, 'word-sign');
  expect(save.decorations.equipped).toEqual(['leaf-flag', null, 'kite']);
  save = equipDecoration(save, 'magpie');
  expect(save.decorations.equipped).toEqual(['leaf-flag', 'magpie', 'kite']);
  expect(unequipAll(save).decorations.equipped).toEqual([null, null, null]);
});
test('newly_unlocked_items_stay_new_until_seen', () => {
  const save = syncDecorations({ ...defaultSave(), rounds: 5 });
  expect(newDecorations(save)).toEqual(['scarecrow']);
  const seen = markDecorationsSeen(save);
  expect(newDecorations(seen)).toEqual([]);
  expect(markDecorationsSeen(seen)).toBe(seen);
});
test('old_save_with_single_equipped_migrates_to_slots_and_counts_as_seen', () => {
  const state = readLearningState({ decorations: { unlocked: ['leaf-flag', 'word-sign', 'nope'], equipped: 'word-sign' } }, new Date('2026-11-25T09:00:00'));
  expect(state.decorations).toEqual({ unlocked: ['leaf-flag', 'word-sign'], equipped: ['word-sign', null, null], seen: ['leaf-flag', 'word-sign'] });
  const next = readLearningState({ decorations: { unlocked: ['kite', 'magpie'], equipped: ['magpie', 'nope', 'kite', 'kite'], seen: ['kite'] } }, new Date('2026-11-25T09:00:00'));
  expect(next.decorations).toEqual({ unlocked: ['kite', 'magpie'], equipped: ['magpie', null, 'kite'], seen: ['kite'] });
});
