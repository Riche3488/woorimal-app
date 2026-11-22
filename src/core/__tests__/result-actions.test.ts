import { resultAction } from '../result-actions';
const context={mode:'practice' as const,practiceType:'spacing' as const,day:'2026-11-22',packVersion:'p',rulesVersion:'1'};
const available={due:0,review:0,starred:0};
test('practice_result_keeps_type',()=>expect(resultAction(context,available)).toMatchObject({target:'play',mode:'practice',practiceType:'spacing'}));
test('empty_review_offers_home',()=>expect(resultAction({...context,mode:'review'},available).target).toBe('home'));
test('challenge_result_offers_share_not_replay_reward',()=>expect(resultAction({...context,mode:'challenge'},available).target).toBe('share'));
test('quick_result_restarts_quick',()=>expect(resultAction({...context,mode:'quick'},available).mode).toBe('quick'));
