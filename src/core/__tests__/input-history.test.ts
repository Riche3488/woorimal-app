import { undoGaps } from '../input-history';
test('undo_restores_only_last_edit_and_keeps_initial_state',()=>{
  expect(undoGaps([[false,false],[true,false],[true,true]])).toEqual([[false,false],[true,false]]);
  expect(undoGaps([[false,false]])).toEqual([[false,false]]);
});
