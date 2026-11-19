// 웹 저장소(woorimal_contest)의 scripts/lib/app-pack.mjs가 만드는 묶음 형식.
export type Source = 'kbs' | 'original' | 'blog';
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
};

export type AppPack = {
  schema: 1;
  version: string;
  generatedAt: string;
  counts: Record<string, number>;
  questions: AppQuestion[];
};

export type AnswerInput = string | boolean[];
