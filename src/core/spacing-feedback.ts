import { spacingGaps } from './grading';
export function spacingFeedback(input: boolean[], answers: string[]): {target:boolean[];wrongIndices:number[]} {
  const candidates=answers.map(a=>spacingGaps(a).gaps).filter(g=>g.length===input.length);
  const distance=(g:boolean[])=>g.reduce((sum,v,i)=>sum+Number(v!==input[i]),0);
  const target=candidates.reduce<boolean[]|null>((best,g)=>!best || distance(g)<distance(best)?g:best,null) ?? [...input];
  return {target,wrongIndices:target.flatMap((v,i)=>v!==input[i]?[i]:[])};
}
