import type { QuestionType, Source } from './types';

// 웹 quiz-types.mjs의 유형 이름을 따른다.
export const TYPE_LABELS: Record<QuestionType, string> = {
  meaning: '뜻 보고 낱말',
  usage: '낱말·문장 쓰임',
  spacing: '띄어쓰기',
  spelling: '맞춤법',
  proverb: '속담 빈칸',
  chosung: '첫소리',
  broadcast: '방송 문제',
};

export function sourceNote(source: Source): string | null {
  return source === 'kbs' ? '출처: KBS 우리말 겨루기' : null;
}

// 설정 화면의 출처 표시. 뜻풀이는 표준국어대사전(CC BY-SA 2.0 KR)을 쓰므로 늘 밝힌다.
export function creditLines(questions: { source: Source }[]): string[] {
  const lines = ['뜻풀이: 국립국어원 표준국어대사전(CC BY-SA 2.0 KR)'];
  if (questions.some(q => q.source === 'kbs')) lines.push('방송 기반 문제 출처: KBS 우리말 겨루기');
  return lines;
}
