# 공부 기능 1차 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** '모르겠어요' 버튼, 간격 복습(1→3→7일), 오답노트 화면(⭐ 담기), 유형 연습 판을 더한다.

**Architecture:** 규칙은 `src/core/`의 순수 함수(`round.ts`·`progress.ts`·`picker.ts`)에 두고 테스트를 먼저 쓴다. 저장은 스키마 1을 유지하고 `loadSave`에서 빠진 필드를 채운다. 화면은 `GameProvider`가 새 함수(⭐ 토글, 판 시작)를 넘긴다.

**Tech Stack:** Expo SDK 58, TypeScript, expo-router, Jest, @testing-library/react-native 14(`await render`, `await fireEvent`).

**Spec:** `docs/superpowers/specs/2026-11-19-study-notebook.md`

## Global Constraints

- Windows PowerShell에서는 `npm.cmd test`, 타입 검사 `npx tsc --noEmit`.
- `assets/pack.json`을 통째로 읽지 않는다. 문제 내용을 이 저장소에서 고치지 않는다.
- 저장 키 `woorimal.save.v1`, `schema: 1` 그대로. 예전 저장을 잃지 않는다.
- 간격: 틀림 → box 1(+1일), box 1 정답 → box 2(+3일), box 2 정답 → box 3(+7일), box 3 정답 → 외움(box 0, `mastered: true`). 복습 날 전 정답은 단계 유지.
- 날짜는 기기 날짜 `YYYY-MM-DD`(`localDay`·`dayDiff`). 일반 판 복습 섞기 최대 2개.
- 문구: 버튼 "모르겠어요", 판정 "모르겠어요", 홈 "📒 오답노트 · 오늘 복습 N", 탭 "복습할 문제 N" / "⭐ 담은 문제 N" / "외운 문제 N", 결과 안내 "📒 n문제를 외웠어요", 복습 판 제목 "복습 끝!", 유형 연습 "○○ 연습 끝!".
- 각 Task 끝: 커밋 뒤 push, `git rev-parse HEAD origin/main`으로 확인. 커밋 메시지 끝에 `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. 묶음 갱신으로 key가 사라진 노트·⭐ 문제 → 목록·판에서 조용히 빠지고 오류 없음. (Task 2 `notebook` 테스트, Task 4 picker 테스트)
2. 같은 날 같은 문제를 여러 번 맞힘 → 단계가 오르지 않음(바로 외움 처리 안 됨). (Task 2)
3. 필드가 없는 예전 저장(`needsReview`만 있음) → 노트로 옮겨지고, 새 형식 저장은 왕복해도 그대로. (Task 3)
4. 판 도중 ⭐를 누른 뒤 판이 끝남 → ⭐가 판 결과 저장에 덮여 사라지지 않음(`complete`가 최신 저장 기준으로 갱신). (Task 3 순수 함수 테스트 + Task 5 구현 규칙)
5. '모르겠어요'를 빠르게 두 번 누르거나 마감 순간에 누름 → 결과 1개, 하트 1개만 줄어듦. (Task 6)

---

### Task 1: '모르겠어요' 규칙 (`round.ts`)

**Files:**
- Modify: `src/core/round.ts`, `src/core/challenge.ts`(`marksFor` 타입만 확인, 동작 그대로)
- Test: `src/core/__tests__/round.test.ts`, `src/core/__tests__/challenge.test.ts`
- 기존 테스트의 `RoundResult` 리터럴(`picker.test.ts`의 `result` 등)에 `gaveUp: false` 추가

**Interfaces:**
- Produces: `RoundResult.gaveUp: boolean`; `giveUp(round: Round, now: number): Round`

- [ ] **Step 1: 실패하는 테스트**
  - `giveUp은 오답과 같다`: 3문제 판에서 `giveUp(r, T0+500)` → `hearts 2`, `streak 0`, `grains 0`, `results[0]`이 `{ correct: false, timedOut: false, gaveUp: true, userAnswer: '' }`, `index 1`.
  - `answer·timeout 결과는 gaveUp false`.
  - `giveUp은 판이 끝났으면 그대로 반환`.
  - challenge: `marksFor([{ correct: false, timedOut: false, gaveUp: true }]) === 'x'`.
- [ ] **Step 2:** `npm.cmd test -- round challenge` → FAIL(`giveUp` 없음)
- [ ] **Step 3:** `settle`에 세 번째 상태를 넘겨 구현(`input: AnswerInput | null | 'giveup'` 대신 내부 인자 `mode: 'answer'|'timeout'|'giveup'` 권장). 제한 시간이 지난 뒤 누른 giveUp은 timeout과 같게(`timedOut: true, gaveUp: false`).
- [ ] **Step 4:** `npm.cmd test` 전체 PASS, `npx tsc --noEmit` 통과
- [ ] **Step 5:** 커밋 `feat: 모르겠어요 규칙(오답과 같게 처리)`

### Task 2: 간격 복습·노트 규칙 (`progress.ts`, `growth.ts`)

**Files:**
- Modify: `src/core/progress.ts`, `src/core/growth.ts`
- Test: `src/core/__tests__/progress.test.ts`(새 파일), `src/core/__tests__/growth.test.ts`

**Interfaces:**
- Consumes: `RoundResult.gaveUp`(Task 1)
- Produces:
  - `addDays(day: string, n: number): string` (growth.ts)
  - `QuestionStat = { seen; correct; lastAt; lastWrongAt?; needsReview: boolean; box: 0|1|2|3; dueDay: string|null; wrong: number; lastAnswer?: string; lastMiss?: 'wrong'|'timeout'|'giveup'; starred?: boolean; mastered?: boolean }`
  - `REVIEW_INTERVALS = [1, 3, 7] as const`
  - `recordResults(p, results, now: number): Progress` (시그니처 그대로, 오늘 = `localDay(new Date(now))`)
  - `normalizeStat(s: Partial<QuestionStat> & { seen: number; correct: number; lastAt: number }): QuestionStat` (예전 기록 채우기)
  - `toggleStar(p: Progress, key: string): Progress` (기록이 없으면 `seen 0, correct 0, lastAt 0, box 0, dueDay null, wrong 0, needsReview false`로 만든다)
  - `type NotebookFilter = 'review' | 'starred' | 'mastered'`
  - `notebook(p, questions, filter, today: string): AppQuestion[]`
  - `notebookCounts(p, questions, today): { review: number; due: number; starred: number; mastered: number }`
  - `newlyMastered(before: Progress, after: Progress): number`
  - `reviewKeys`는 `notebook(..., 'review', today)`와 같은 뜻으로 바꾸거나 제거(사용처는 Task 4·5에서 정리)

- [ ] **Step 1: 실패하는 테스트** (`D0 = new Date(2026,10,19,9).getTime()`, `day(n) = D0 + n*DAY`)
  - `addDays('2026-11-30', 1) === '2026-12-01'`, `addDays('2026-11-19', 7) === '2026-11-26'`
  - `틀리면 box 1, 내일 복습, wrong 1, lastAnswer 저장`: 오답 `userAnswer '쌀쌀하다'` → `{ box: 1, dueDay: '2026-11-20', wrong: 1, lastAnswer: '쌀쌀하다', lastMiss: 'wrong', needsReview: true }`
  - `모르겠어요·시간 초과는 lastAnswer 비움, lastMiss 각각 'giveup'/'timeout'`
  - `복습 날 정답이면 1→2(+3일)→3(+7일)→외움`: day0 오답, day1 정답 → box 2 dueDay day4, day4 정답 → box 3 dueDay day11, day11 정답 → `{ box: 0, dueDay: null, mastered: true, needsReview: false }`
  - `복습 날 전 정답은 단계 유지`: day0 오답 → 같은 날 정답 3번 → box 1, dueDay '2026-11-20' 그대로, `correct 3`
  - `외운 뒤 다시 틀리면 box 1, mastered false`
  - `노트에 없던 문제 정답은 box 0 유지`
  - `toggleStar는 켜고 끄고, 없는 key면 seen 0 기록을 만든다`; recordResults 뒤에도 `starred` 유지
  - `notebook review: 복습 날 된 것(밀린 순) 먼저, 그다음 dueDay 빠른 순`, `묶음에 없는 key는 빠진다`
  - `notebook starred`: ⭐만, `lastAt` 작은 순 / `mastered`: 외운 것만, `lastAt` 큰 순
  - `notebookCounts`: 위 상태에서 각 수, `due`는 `dueDay <= today`
  - `newlyMastered`: before box 3 → after mastered 1개면 1
  - `normalizeStat`: `{ seen 2, correct 0, lastAt, lastWrongAt: D0, needsReview: true }` → `box 1, dueDay '2026-11-20', wrong 2`; `needsReview false, seen 3, correct 2` → `box 0, dueDay null, wrong 1`; 이미 새 형식이면 그대로(`toEqual` 입력)
- [ ] **Step 2:** `npm.cmd test -- progress growth` → FAIL
- [ ] **Step 3:** 구현. `needsReview`는 필드로 두고 항상 `box > 0`과 같게 쓴다(기존 테스트 호환). 틀림 시 `lastWrongAt: now` 유지.
- [ ] **Step 4:** `npm.cmd test` 전체 PASS(기존 picker 테스트의 `needsReview` 단언 포함), `npx tsc --noEmit`
- [ ] **Step 5:** 커밋 `feat: 간격 복습(1·3·7일)과 오답노트 규칙`

### Task 3: 저장 옮기기·판 종류 (`save.ts`)

**Files:**
- Modify: `src/data/save.ts`
- Test: `src/data/__tests__/save.test.ts`

**Interfaces:**
- Consumes: `normalizeStat`, `toggleStar`(Task 2)
- Produces: `RoundMode = 'normal' | 'review' | 'challenge' | 'starred' | 'practice'`; `toggleStarSave(d: SaveData, key: string): SaveData`

- [ ] **Step 1: 실패하는 테스트**
  - `예전 저장(needsReview만)은 읽을 때 노트 형식으로 채운다`: stats `{ 'meaning:1': { seen 1, correct 0, lastAt: D0, lastWrongAt: D0, needsReview: true } }` 저장 → `loadSave()`의 stat이 `box 1, dueDay '2026-11-20', wrong 1`
  - 기존 `저장 왕복이 같다` 테스트가 그대로 PASS(새 형식은 바뀌지 않음)
  - `⭐는 판 결과 저장 뒤에도 남는다`: `finishRound(toggleStarSave(defaultSave(), 'meaning:2'), round(meaning:2 오답), now)` → `starred true, box 1`
- [ ] **Step 2:** `npm.cmd test -- save` → FAIL
- [ ] **Step 3:** `loadSave`에서 `progress.stats`의 각 값을 `normalizeStat`으로 통과. `toggleStarSave`는 `progress`만 바꾼다.
- [ ] **Step 4:** 전체 PASS, tsc
- [ ] **Step 5:** 커밋 `feat: 예전 오답 기록을 오답노트 형식으로 옮기기`

### Task 4: 출제 (`picker.ts`)

**Files:**
- Modify: `src/core/picker.ts`
- Test: `src/core/__tests__/picker.test.ts`

**Interfaces:**
- Consumes: `notebook`, `QuestionStat.dueDay`(Task 2)
- Produces (모두 `{ count = ROUND_SIZE, rng = Math.random, now: number }` 옵션, 보기 섞음):
  - `pickRound(questions, p, opts)` — 복습 섞기 기준을 `dueDay <= today`로
  - `pickReviewRound(questions, p, opts)` — 복습 날 된 것(밀린 순) → 나머지 노트(`lastWrongAt` 최근 순)
  - `pickStarredRound(questions, p, opts)` — ⭐, `lastAt` 작은 순
  - `pickTypeRound(questions, p, type: QuestionType, opts)` — 그 유형만: 복습 날 된 노트 → 안 푼 것(섞음) → `lastAt` 오래된 순. 쉬운 문제 우선 없음
  - `pickReviewRound`의 `now`가 새로 필수가 되므로 호출부(Task 5)에서 넘긴다

- [ ] **Step 1: 실패하는 테스트**
  - 기존 `하루 이상 지난 틀린 문제는 최대 2개, 1시간 전 …` 테스트를 dueDay 기준으로 유지(이틀 전 오답 3개 → 2개만, 오늘 오답은 안 들어감)
  - `pickReviewRound: 복습 날 된 문제가 앞, 날 안 된 노트 문제가 뒤, 외운 문제 없음`
  - `pickStarredRound: ⭐만, 묶음에 없는 key 건너뜀`
  - `pickTypeRound('spelling'): 10개 모두 spelling, 복습 날 된 spelling 노트 문제 포함, 어려운 문제도 나올 수 있음`
  - `pickTypeRound: 그 유형 문제가 10개 미만이면 있는 만큼`
- [ ] **Step 2:** `npm.cmd test -- picker` → FAIL
- [ ] **Step 3:** 구현(`DAY_MS` 비교 제거)
- [ ] **Step 4:** 전체 PASS, tsc
- [ ] **Step 5:** 커밋 `feat: 복습·⭐·유형 연습 출제`

### Task 5: 상태와 판 시작 (`GameProvider`, `play.tsx`)

**Files:**
- Modify: `src/state/GameProvider.tsx`, `src/app/play.tsx`
- Test: 기존 화면 테스트가 깨지지 않는지(새 테스트는 Task 6·7 화면 테스트가 담당)

**Interfaces:**
- Consumes: Task 2·3·4
- Produces (`Game`에 추가/변경):
  - `counts: { review: number; due: number; starred: number; mastered: number }` (`reviewCount` 대체; 오늘 = `localDay(new Date())`)
  - `startReview()`, `startStarred()`, `startPractice(type: QuestionType)`
  - `toggleStar(key: string): void`
  - `lastPracticeType: QuestionType | null` (결과 제목용)
  - play 화면 params: `mode = 'normal'|'review'|'challenge'|'starred'|'practice'`, `type`(practice일 때)

- [ ] **Step 1:** `complete`와 `toggleStar`를 `setSave(prev => …)` 함수형 갱신으로 바꾸고 `previousSave`는 같은 `prev`로 설정(⭐가 판 결과에 덮이지 않게). 저장 쓰기도 그 안에서.
- [ ] **Step 2:** play.tsx에서 mode별 시작 함수 연결, `complete(round, mode)`에 해당 mode 전달. 문제가 0개면 지금의 "풀 문제가 없어요" 화면.
- [ ] **Step 3:** 홈의 `reviewCount` 사용처를 `counts`로 임시 교체(버튼 모양은 Task 7). 화면 테스트의 `GameContextProvider` 목 값도 새 필드로 갱신.
- [ ] **Step 4:** `npm.cmd test` 전체 PASS, `npx tsc --noEmit`
- [ ] **Step 5:** 커밋 `feat: ⭐ 담기·복습·유형 연습 판 상태 연결`

### Task 6: 게임 화면 ('모르겠어요'·⭐)

**Files:**
- Modify: `src/components/PlayScreen.tsx`, `src/app/play.tsx`
- Test: `src/components/__tests__/play.test.tsx`

**Interfaces:**
- Consumes: `giveUp`(Task 1), `toggleStar`(Task 5)
- Produces: `PlayScreen` props 추가 `starred?: (key: string) => boolean`, `onToggleStar?: (key: string) => void` (없으면 별 버튼 숨김). 별 버튼 `accessibilityLabel` "담기" / "담기 취소".

- [ ] **Step 1: 실패하는 테스트**
  - `모르겠어요를 누르면 하트가 줄고 정답과 '모르겠어요'가 보인다`: 선택형 → `getByText('모르겠어요')` 누름 → 하트 2, 판정 텍스트 "모르겠어요", "정답: 오뚝이", "눌러서 다음 문제"
  - `모르겠어요를 두 번 빠르게 눌러도 결과 1개`: 두 번 누르고(두 번째는 피드백 중이라 버튼 없음 → `queryByText` 확인) 다음 → 판 끝 시 `results`에 gaveUp 1개
  - `입력형·띄어쓰기에도 모르겠어요가 있다`
  - `별을 누르면 onToggleStar(key)가 불리고 다음 문제로 넘어가지 않는다`: 오답 뒤 피드백에서 `getByLabelText('담기')` 누름 → 호출 1회, 문제 그대로
- [ ] **Step 2:** `npm.cmd test -- play` → FAIL
- [ ] **Step 3:** 구현. "모르겠어요"는 답 입력 아래 작은 회색 텍스트 버튼(`hitSlop` 넉넉히), `phase === 'question'`일 때만. 판정 문구: `last.gaveUp ? '모르겠어요' : last.timedOut ? '시간 초과' : '아쉬워요'`. 별은 피드백 카드 판정 줄 오른쪽, 따로 `Pressable`(눌러도 카드 `onPress`가 안 불리게). play.tsx에서 `starred = key => !!game.save.progress.stats[key]?.starred`, `onToggleStar = game.toggleStar` 전달.
- [ ] **Step 4:** 전체 PASS, tsc
- [ ] **Step 5:** 커밋 `feat: 게임 화면에 모르겠어요·⭐ 담기`

### Task 7: 오답노트 화면과 홈 버튼

**Files:**
- Create: `src/app/notebook.tsx`, `src/components/__tests__/notebook.test.tsx`
- Modify: `src/app/index.tsx`, `src/app/_layout.tsx`(라우트 등록이 필요하면)

**Interfaces:**
- Consumes: `notebook`, `notebookCounts`(Task 2), `counts`·`toggleStar`(Task 5), `sourceNote`, `TYPE_LABELS`

- [ ] **Step 1: 실패하는 테스트** (`GameContextProvider`로 저장·묶음 주입, `expo-router` 목)
  - `탭 세 개에 수가 보인다`: "복습할 문제 2", "⭐ 담은 문제 1", "외운 문제 0"
  - `복습 탭: 오늘 복습 문제가 먼저, '오늘 복습'·'n일 뒤' 표시`
  - `행을 누르면 정답·내 답·틀린 횟수·해설이 펼쳐진다`; 모르겠어요 기록이면 "내 답: 모르겠어요"
  - `복습 풀기 버튼은 play로 mode review`, ⭐ 탭에서는 "⭐ 풀기" → mode starred; 0개면 disabled
  - `빈 탭 안내`: "틀린 문제가 여기에 모여요" / "문제를 풀다가 ⭐를 눌러 담아 보세요" / "세 번 맞힌 문제가 여기에 모여요"
  - `행의 ⭐를 누르면 toggleStar(key)`
- [ ] **Step 2:** `npm.cmd test -- notebook` → FAIL
- [ ] **Step 3:** 구현(스펙의 스케치대로). 단계 점: box 1 "●○○", 2 "●●○", 3 "●●●". 홈 버튼을 "📒 오답노트 · 오늘 복습 N"(N = `counts.due`)으로 바꾸고 늘 누를 수 있게, `/notebook`으로 이동.
- [ ] **Step 4:** 전체 PASS, tsc
- [ ] **Step 5:** 커밋 `feat: 오답노트 화면`

### Task 8: 기록 화면 유형 연습·결과 화면·README

**Files:**
- Modify: `src/app/record.tsx`, `src/app/result.tsx`, `src/core/goals.ts`(안내 줄), `README.md`
- Test: `src/core/__tests__/goals.test.ts`

**Interfaces:**
- Consumes: `newlyMastered`(Task 2), `lastMode`·`lastPracticeType`·`toggleStar`(Task 5)
- Produces: `NudgeInput.mastered?: number` — 1 이상이면 안내 줄 맨 앞 "📒 n문제를 외웠어요"(최대 2줄 규칙 유지)

- [ ] **Step 1: 실패하는 테스트**: `resultNudges({ ...기본, mastered: 2 })[0] === '📒 2문제를 외웠어요'`, 다른 안내와 합쳐도 2줄 이하
- [ ] **Step 2:** `npm.cmd test -- goals` → FAIL
- [ ] **Step 3:** 구현
  - goals.ts 안내 줄
  - record.tsx: 유형 행을 `Pressable`로, 오른쪽에 "연습 ›", 누르면 `/play` `{ mode: 'practice', type }`
  - result.tsx: 제목 — review "복습 끝!", practice `${TYPE_LABELS[type]} 연습 끝!`, 하트 0이면 지금처럼 "하트를 다 썼어요". 틀린 문제 카드에 `r.gaveUp ? '모르겠어요' : …`와 ⭐ 버튼. `mastered: newlyMastered(previousSave.progress, save.progress)` 전달. "다음 판" 버튼은 지금처럼 일반 판.
  - README: 스펙 링크 한 줄, 오답노트·간격 복습 설명 한두 줄
- [ ] **Step 4:** `npm.cmd test` 전체 PASS, `npx tsc --noEmit`
- [ ] **Step 5:** 커밋 `feat: 유형 연습 진입·결과 화면 공부 안내`
