import type { QuestionType } from './types';
import type { RoundMode, SessionContext } from './session';
export type ResultAction={label:string;target:'play'|'home'|'share';mode?:RoundMode;practiceType?:QuestionType};
export function resultAction(context:SessionContext,available:{due:number;review:number;starred:number}):ResultAction {
  if(context.mode==='challenge')return {label:'결과 공유',target:'share'};
  if(context.mode==='review' && !available.review || context.mode==='starred' && !available.starred)return {label:'홈으로',target:'home'};
  return {label:context.mode==='review'?'복습 더 하기':context.mode==='practice'?'같은 유형 더 풀기':context.mode==='starred'?'담은 문제 더 풀기':context.mode==='quick'?'가볍게 한 번 더':'다음 판',target:'play',mode:context.mode,...(context.practiceType?{practiceType:context.practiceType}:{})};
}
