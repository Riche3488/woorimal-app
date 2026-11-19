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
