// 채점 규칙. 웹 저장소 public/scripts/lib/grading.mjs와 mock.mjs(acceptedAnswers·gradeItem)를 옮긴 것이다.
// 웹 규칙이 바뀌면 함께 맞춘다.
import type { AnswerInput, AppQuestion } from './types';

const CHOSUNG = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];

export function getChosung(str: string): string {
  return str.split('').map(ch => {
    const code = ch.charCodeAt(0) - 0xAC00;
    if (code < 0 || code > 11171) return ch;
    return CHOSUNG[Math.floor(code / 588)];
  }).join('');
}

// 휴대폰 키보드는 조합형(NFD)으로 보내기도 하므로 NFC로 맞춘 뒤 공백을 모두 지운다.
export function normalizeAnswer(str: unknown): string {
  return String(str ?? '').normalize('NFC').replace(/\s+/g, '');
}

export function gradeTyped(input: string, answer: string, synonyms: string[] = []) {
  const given = normalizeAnswer(input);
  if (!given) return { correct: false, synonymHit: false };
  if (given === normalizeAnswer(answer)) return { correct: true, synonymHit: false };
  return { correct: false, synonymHit: synonyms.some(s => normalizeAnswer(s) === given) };
}

// gaps[i]는 i번째 음절 뒤에 공백이 있는지를 뜻한다. 길이는 음절 수 - 1이다.
export function spacingGaps(sentence: string): { syllables: string[]; gaps: boolean[] } {
  const chunks = String(sentence).normalize('NFC').trim().split(/\s+/).filter(Boolean);
  const syllables: string[] = [];
  const gaps: boolean[] = [];
  chunks.forEach((chunk, ci) => {
    const chars = Array.from(chunk);
    chars.forEach((ch, i) => {
      syllables.push(ch);
      const isLastOverall = ci === chunks.length - 1 && i === chars.length - 1;
      if (!isLastOverall) gaps.push(i === chars.length - 1);
    });
  });
  return { syllables, gaps };
}

export function gradeSpacing(gaps: boolean[], answers: string[]): boolean {
  return answers.some(ans => {
    const expected = spacingGaps(ans).gaps;
    return expected.length === gaps.length && expected.every((g, i) => g === !!gaps[i]);
  });
}

export function gapsToSentence(syllables: string[], gaps: boolean[]): string {
  return syllables.map((s, i) => (gaps[i] ? s + ' ' : s)).join('');
}

const CIRCLED = '①②③④⑤⑥⑦⑧⑨⑩';
const norm = (s: unknown) => normalizeAnswer(s).replace(/^['"‘“]+|['"’”.]+$/g, '');

// 블로그 정답 표기("②도량", "①오똑하다 -> 오뚝하다", "간(肝)", "백수 / 까치발")에서 받아 줄 답을 모은다.
export function acceptedAnswers(answer: string): string[] {
  const base = String(answer).trim();
  const out = new Set([base]);
  const add = (s: string) => { if (s && s.trim()) out.add(s.trim()); };
  for (const side of base.split(/\s*(?:->|→)\s*/)) {
    add(side);
    const circledAll = [...side].filter(ch => CIRCLED.includes(ch));
    const circled = circledAll.length === 1 ? circledAll[0] : null;
    if (circled) {
      add(circled);
      add(String(CIRCLED.indexOf(circled) + 1));
      add(side.replace(/[①-⑩]/g, ''));
    }
  }
  for (const s of [...out]) add(s.replace(/\([^)]*\)/g, ''));
  return [...out].map(norm).filter(Boolean);
}

export function gradeItem(q: Pick<AppQuestion, 'kind' | 'answer'>, input: AnswerInput): boolean {
  if (q.kind === 'spacing') return Array.isArray(input) && gradeSpacing(input, [q.answer]);
  const given = norm(input);
  if (!given) return false;
  const accepted = acceptedAnswers(q.answer);
  const bare = (s: string) => s.replace(/[\/,·]/g, '');
  if (accepted.includes(given) || accepted.some(a => bare(a) === bare(given))) return true;
  if (String(q.answer).includes(',')) {
    const parts = (value: unknown) => String(value).split(/[,、/·]/).map(norm).filter(Boolean)
      .map(p => p.replace(/[①-⑩]/g, ch => String(CIRCLED.indexOf(ch) + 1))).sort();
    const expected = parts(q.answer), actual = parts(input);
    return actual.length === expected.length && expected.every((part, i) => part === actual[i]);
  }
  return false;
}

// 웹 quiz.mjs submit()과 같은 분기.
export function grade(q: AppQuestion, input: AnswerInput): { correct: boolean; synonymHit: boolean } {
  if (q.kind === 'spacing') return { correct: Array.isArray(input) && gradeSpacing(input, q.answers ?? [q.answer]), synonymHit: false };
  const text = Array.isArray(input) ? '' : input;
  if (q.kind === 'choice') return { correct: text === q.answer, synonymHit: false };
  if (q.type === 'broadcast') return { correct: gradeItem(q, text), synonymHit: false };
  return gradeTyped(text, q.answer, q.synonyms);
}
