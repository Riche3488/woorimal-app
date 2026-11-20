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

// 오늘의 낱말 카드(웹 자체 학습 낱말). question은 카드 아래에서 푸는 쓰임 문제의 key.
export type AppCard = {
  key: string;
  word: string;
  title: string;
  pos: string;
  meaning: string;
  explain: string;
  tip: string;
  examples: string[];
  question: string;
};

// 가로세로 퍼즐 판(웹 공개 허용분). 칸 좌표는 0부터, 낱말이 지나지 않는 칸은 검은 칸.
export type CrosswordEntry = { num: number; dir: 'across' | 'down'; row: number; col: number; answer: string; clue: string };
export type AppCrossword = {
  id: string;
  level: 'easy' | 'normal' | 'hard';
  theme: string;
  rows: number;
  cols: number;
  entries: CrosswordEntry[];
  intro: string;
  notes: { title: string; text: string }[];
};

export type AppPack = {
  schema: 1;
  version: string;
  generatedAt: string;
  counts: Record<string, number>;
  questions: AppQuestion[];
  cards?: AppCard[]; // 선택 필드: 없으면 오늘의 낱말을 숨긴다
  crosswords?: AppCrossword[]; // 선택 필드: 없으면 퍼즐을 숨긴다
  minApp?: number; // 이 묶음을 읽으려면 필요한 앱 수준(APP_PACK_COMPAT)
  shrink?: boolean; // 문제 수를 일부러 크게 줄인 배포(예: 출처 일괄 제외)
};

export type AnswerInput = string | boolean[];
