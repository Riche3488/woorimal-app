import test from 'node:test';
import assert from 'node:assert/strict';
import { checkSpacingExplanations } from './check-spacing-explanations.mjs';
const q={key:'spacing:1',type:'spacing',kind:'spacing',answer:'가 나다',answers:['가 나다','가나 다'],syllables:['가','나','다'],explain:''};
test('all answer variants must describe the same syllables',()=>{
  assert.deepEqual(checkSpacingExplanations({questions:[q]},['spacing:1']).errors,[]);
  assert.match(checkSpacingExplanations({questions:[{...q,answers:['가 마다']}]},['spacing:1']).errors.join(' '),/syllables/);
});
test('new spacing items require explanation and existing coverage cannot regress',()=>{
  const report=checkSpacingExplanations({questions:[q,{...q,key:'spacing:2'}]},['spacing:1']);
  assert.deepEqual(report.missingKeys,['spacing:1','spacing:2']);
  assert.match(report.errors.join(' '),/spacing:2/);
  assert.equal(checkSpacingExplanations({questions:[{...q,explain:'규칙과 예문'}]},[]).missingKeys.length,0);
});
