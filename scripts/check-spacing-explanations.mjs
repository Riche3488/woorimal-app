import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
export function checkSpacingExplanations(pack,baselineMissingKeys=[]){
  const baseline=new Set(baselineMissingKeys),errors=[],missingKeys=[];
  const questions=pack.questions.filter(q=>q.type==='spacing');
  for(const q of questions){
    if(!String(q.explain??'').trim()){
      missingKeys.push(q.key);
      if(!baseline.has(q.key))errors.push(`${q.key}: new missing explanation`);
    }
    if(!Array.isArray(q.answers)||!q.answers.length||!Array.isArray(q.syllables))errors.push(`${q.key}: invalid answers/syllables`);
    else for(const answer of q.answers){
      if(typeof answer!=='string'||answer.normalize('NFC').replace(/\s+/g,'')!==q.syllables.join('').normalize('NFC'))errors.push(`${q.key}: answer variant has different syllables`);
    }
  }
  return {total:questions.length,explained:questions.length-missingKeys.length,missingKeys,errors};
}
if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const input=process.argv.slice(2).find(a=>!a.startsWith('--'))??'assets/pack.json';
  const pack=JSON.parse(fs.readFileSync(input,'utf8'));
  const baseline=JSON.parse(fs.readFileSync(new URL('../docs/content/spacing-explanation-baseline.json',import.meta.url),'utf8'));
  const result=checkSpacingExplanations(pack,baseline.missingKeys);
  console.log(JSON.stringify({...result,missingKeys:undefined,missing:result.missingKeys.length},null,2));
  if(result.errors.length || process.argv.includes('--strict') && result.missingKeys.length)process.exitCode=1;
}
