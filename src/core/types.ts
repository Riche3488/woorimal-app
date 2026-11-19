// 웹 저장소(woorimal_contest)의 scripts/lib/app-pack.mjs가 만드는 묶음 형식.
// adapted: 방송 문제에서 낱말만 가져와 사전 뜻풀이·새 문장으로 다시 만든 문제(웹 scripts/lib/app-adapt.mjs). KBS 출처를 붙이지 않는다.
export type Source = 'kbs' | 'original' | 'blog' | 'adapted';
export type QuestionType = 'meaning' | 'usage' | 'spacing' | 'spelling' | 'proverb' | 'chosung' | 'broadcast';
export type QuestionKind = 'choice' | 'typed' | 'spacing';

export type AppQuestion = {
  key: string;
  type: QuestionType;
  kind: QuestionKind;
  prompt: string;
  answer: string;
  explain: string;
  choices?: string[];
  answers?: string[];
  syllables?: string[];
  synonyms?: string[];
  hint?: { chosung: string; syllables: number };
  source: Source;
  easy: boolean;
  level?: 'normal' | 'hard';
  label?: string; // 방송 문제 소제목(무엇을 고르는지)
};

export type AppPack = {
  schema: 1;
  version: string;
  generatedAt: string;
  counts: Record<string, number>;
  questions: AppQuestion[];
  minApp?: number; // 이 묶음을 읽으려면 필요한 앱 수준(APP_PACK_COMPAT)
  shrink?: boolean; // 문제 수를 일부러 크게 줄인 배포(예: 출처 일괄 제외)
};

export type AnswerInput = string | boolean[];
