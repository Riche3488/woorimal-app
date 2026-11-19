# 우리말 곳간 앱 1차 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 웹 데이터로 만든 문제 묶음을 오프라인으로 푸는, 시간제한·하트·곳간 성장이 있는 Android 숏폼 퀴즈 앱 1차판.

**Architecture:** 두 저장소. (A) `woorimal_contest`의 `npm run build`가 웹 퀴즈 변환 코드(`original-quiz.mjs`의 `buildPools`)를 그대로 써서 앱용 `public/app/pack.json`을 만들고 Firebase Hosting으로 배포한다. (B) `woorimal_app`(Expo)은 빌드 시점의 묶음을 내장하고, 실행 때 새 버전을 받아 교체한다. 게임 규칙은 화면과 분리한 `src/core/*.ts` 순수 함수로 두고 Jest로 검증한다.

**Tech Stack:** (A) Node 22, `node --test`. (B) Expo 최신 안정 SDK(`npx create-expo-app@latest`, TypeScript, expo-router), `@react-native-async-storage/async-storage`, `expo-file-system`, `expo-haptics`, `react-native-reanimated`, `jest-expo` + `@testing-library/react-native`.

**Spec:** `docs/superpowers/specs/2026-11-19-woorimal-app-design.md`

## Global Constraints

- 콘텐츠 원본은 `woorimal_contest/data/*.json`. 앱 저장소에서 콘텐츠를 고치지 않는다. `data/episodes/`에 쓰지 않는다.
- 모든 문제에 `source` 라벨: `"kbs"`(방송 기반) · `"original"`(자체·낱말 기반) · `"blog"`(블로그 띄어쓰기, 출처 비표시).
- `source === "kbs"` 문제는 문제 아래에 작게 **`출처: KBS 우리말 겨루기`**. 그 밖에는 표시하지 않는다.
- 한 판 10문제, 하트 3개, 하트 0이면 판 종료, 충전 대기 없이 바로 새 판.
- 입력형은 직접 입력(보기 변환 없음). 채점은 웹 규칙 그대로(`normalizeAnswer`·`gradeTyped`·`gradeItem`).
- 광고·계정·서버 쓰기 없음. 비밀 값(`STDICT_API_KEY`, Firebase 설정)을 앱에 넣지 않는다.
- 웹 저장소 코드는 앱에서 import하지 않고 TypeScript로 옮긴다(함수 이름·동작 유지).
- Windows: `npm.cmd`. 웹 저장소는 `git add -A` 금지, 관련 파일만 커밋 후 push·`git rev-parse HEAD origin/<branch>` 확인. 웹 저장소 공용 내보내기(`public/scripts/lib/*.mjs`)는 바꾸지 않는다.

**설계에서 조정한 점(계획 단계 판단):** 데이터의 띄어쓰기 문제는 보기형이 아니라 "띄울 자리를 누르는" 방식(최대 수십 음절)이라, 설계의 "띄어쓰기 5~7초"는 지킬 수 없다. 제한 시간은 Task B3의 `timeLimitMs` 공식을 따른다.

## Review Focus

1. 휴대폰 한글 키보드가 조합형(NFD)·끝 공백을 보내도 정답 처리 → Task B1 테스트.
2. 문제 도중 앱이 백그라운드로 갔다 돌아옴 → 남은 시간은 실제 경과 시각 기준(멈추지 않음), 이미 넘었으면 시간 초과 → Task B3 테스트.
3. 오프라인·내려받기 실패·깨진 묶음 → 내장 묶음으로 계속 동작 → Task B2 테스트.
4. 새 묶음에서 문제가 빠짐(KBS 제외) → 기록에 남은 키로 앱이 죽지 않고, 다시 풀 문제가 0개면 버튼 비활성 → Task B4 테스트.
5. 기기 날짜를 되돌리거나 자정을 넘김 → 연속 기록이 음수·중복 증가하지 않음 → Task B5 테스트.

---

## Part A — 웹 저장소(`D:\projects\woorimal_contest`)

### Task A1: 앱용 문제 묶음 내보내기

**Files:**
- Create: `scripts/lib/app-pack.mjs`
- Modify: `scripts/build.mjs` (`main()`에서 `studySets` 계산 뒤 묶음 쓰기)
- Test: `tests/app-pack.test.mjs`

**Interfaces:**
- Consumes: `buildPools(data, { rng })` from `public/scripts/lib/original-quiz.mjs`, `isEasy(q)` from `public/scripts/lib/quiz-growth.mjs`
- Produces (앱이 의존하는 형식):
  ```ts
  type AppQuestion = {
    key: string; type: 'meaning'|'usage'|'spacing'|'spelling'|'proverb'|'chosung'|'broadcast';
    kind: 'choice'|'typed'|'spacing'; prompt: string; answer: string; explain: string;
    choices?: string[]; answers?: string[]; syllables?: string[]; synonyms?: string[];
    hint?: { chosung: string; syllables: number };
    source: 'kbs'|'original'|'blog'; easy: boolean; level?: 'normal'|'hard';
  };
  type AppPack = { schema: 1; version: string; generatedAt: string; counts: Record<string, number>; questions: AppQuestion[] };
  ```
  `sourceOf(type: string, record: object): 'kbs'|'original'|'blog'`, `buildAppPack(data, { excludeSources = [], now = new Date() }): AppPack`, `writeAppPack(pack, outDir): Promise<void>` → `outDir/pack.json`, `outDir/version.json` (`{schema, version, url: "pack.json"}`)

- [ ] **Step 1: 실패하는 테스트 작성** — `tests/app-pack.test.mjs`
  - `sourceOf('broadcast', {id:'x'})` → `'kbs'`
  - `sourceOf('chosung', {id:'1', source:'976회'})` → `'kbs'`; `sourceOf('chosung', {id:'1'})` → `'original'`
  - `sourceOf('spacing', {id:'976-1-3'})`, `{id:'special-1-2-3'}` → `'kbs'`; `{id:'569'}` → `'blog'`
  - `sourceOf('meaning', {...})`, `sourceOf('usage', {...})` → `'original'`
  - `buildAppPack(fixture)`: 모든 질문에 `source`·`easy`(boolean)가 있고, `key` 중복 없음, 기록용 내부 필드(`studyHref`, `learning`, `studyId`, `notes`)는 빠짐
  - `buildAppPack(fixture, {excludeSources:['kbs']})` → `source==='kbs'` 0개, `counts.total`이 그만큼 줄어듦
  - 같은 입력이면 `version`이 같고(질문 배열 SHA-256 앞 12자), 질문 하나를 바꾸면 달라짐
  - fixture는 `tests/fixtures/`에 있는 소형 자료를 쓰거나 테스트 안에서 각 유형 1~2개씩 만든다
- [ ] **Step 2: 실행해 실패 확인** — `npm.cmd test -- tests/app-pack.test.mjs` → FAIL(모듈 없음)
- [ ] **Step 3: `scripts/lib/app-pack.mjs` 구현** — `buildPools(data, { rng: () => 0 })`로 변환(보기 순서는 앱이 섞음), 유형별 원본 레코드와 `id`로 맞춰 `sourceOf` 적용. `sourceOf` 규칙: `broadcast` → kbs; `spacing`은 id가 `/^special-/` 또는 `/^\d+-\d+-\d+/`이면 kbs, 아니면 blog; `chosung`·`spelling`·`proverb`는 `source` 필드가 있으면 kbs, 없으면 original; `meaning`·`usage` → original. `easy = isEasy(q)`.
- [ ] **Step 4: 테스트 통과 확인** — 같은 명령 → PASS
- [ ] **Step 5: 빌드에 연결** — 새 설정 파일 `config/app-pack.json` = `{ "excludeSources": [] }`(KBS 문제를 앱에서 뺄 때 `["kbs"]`로 바꾸고 빌드·배포). `scripts/build.mjs` `main()`에서 `studySets` 뒤에 이 설정을 읽어 `await writeAppPack(buildAppPack({ words, ...studySets }, { excludeSources }), path.join(PUBLIC_DIR, 'app'))`. 커밋 대상에 `config/app-pack.json` 추가. 실행: `npm.cmd run build` → `public/app/pack.json` 생성, 콘솔 요약에 `앱 묶음 N문제` 포함. 확인: `node -e "const p=require('./public/app/pack.json');console.log(p.version,p.questions.length,p.counts)"` → 질문 수가 `counts.json`의 meaning+usage+spacing+spelling+proverb+chosung+broadcast 합과 같음
- [ ] **Step 6: 전체 테스트** — `npm.cmd test` → 모두 PASS
- [ ] **Step 7: 커밋·push** — `git add scripts/lib/app-pack.mjs scripts/build.mjs tests/app-pack.test.mjs` (생성물 `public/app/`이 다른 생성물처럼 추적 대상인지 `git check-ignore`로 확인 후 같은 규칙을 따름) → `git commit -m "feat: 앱용 문제 묶음(public/app/pack.json) 내보내기"` → push → `git rev-parse HEAD origin/master` 일치 확인

---

## Part B — 앱 저장소(`D:\projects\woorimal_app`)

공통 위치: 순수 로직 `src/core/`, 테스트 `src/core/__tests__/`, 화면 `app/`(expo-router), 컴포넌트 `src/components/`.

### Task B1: 프로젝트 골격 + 타입 + 채점

**Files:**
- Create: Expo 골격(`npx create-expo-app@latest . --template default` 후 예제 화면 정리), `jest.config.js`(preset `jest-expo`), `src/core/types.ts`, `src/core/grading.ts`
- Test: `src/core/__tests__/grading.test.ts`

**Interfaces:**
- Produces: `src/core/types.ts`의 `AppQuestion`, `AppPack`(Task A1 형식 그대로), `Source`
- Produces: `getChosung(s)`, `normalizeAnswer(s)`, `gradeTyped(input, answer, synonyms?) → {correct, synonymHit}`, `spacingGaps(sentence) → {syllables, gaps}`, `gradeSpacing(gaps: boolean[], answers: string[])`, `acceptedAnswers(answer) → string[]`, `gradeItem(q, input)`, `grade(q: AppQuestion, input: string | boolean[]) → {correct: boolean, synonymHit: boolean}`
  - `grade`는 웹 `quiz.mjs submit()`의 분기와 같음: spacing → `gradeSpacing(input, q.answers)`, choice → `input === q.answer`, typed+broadcast → `gradeItem`, 그 밖의 typed → `gradeTyped`

- [ ] **Step 1: 골격 생성** — 실행: `npx create-expo-app@latest . --template default`(빈 저장소 루트, `docs/` 유지), `npx expo install jest-expo jest @types/jest`; `package.json` scripts에 `"test": "jest"`. 확인: `npm.cmd test -- --passWithNoTests` → 종료 코드 0
- [ ] **Step 2: 실패하는 테스트** — `grading.test.ts`. 웹 `woorimal_contest/tests/lib/`의 grading·mock 채점 테스트에서 사례를 옮기고 다음을 반드시 포함:
  - `grade(typedQ('포옹'), '포옹 ')` → correct; NFD로 분해한 `'포옹'.normalize('NFD')` → correct (Review Focus 1)
  - `gradeTyped('보듬다','껴안다',['보듬다'])` → `{correct:false, synonymHit:true}`
  - `grade(broadcastTyped('②도량'), '2')`·`'도량'` → correct; `'오똑하다 -> 오뚝하다'`에 `'오뚝하다'` → correct; `'이목구비, 안색'`에 `'안색, 이목구비'` → correct, `'안색'`만 → wrong
  - `grade(spacingQ(['할 수밖에 없다']), gapsOf('할 수밖에 없다'))` → correct
  - 빈 입력 `''` → wrong
- [ ] **Step 3: 실행해 실패 확인** — `npm.cmd test -- grading` → FAIL
- [ ] **Step 4: 구현** — 웹 `public/scripts/lib/grading.mjs` 전체와 `mock.mjs`의 `acceptedAnswers`·`gradeItem`(+`CIRCLED`, `norm`)을 TypeScript로 옮김
- [ ] **Step 5: 통과 확인** — 같은 명령 → PASS
- [ ] **Step 6: 커밋** — `git add -A`(새 저장소, 다른 작업 없음) → `git commit -m "feat: Expo 골격, 문제 타입, 웹 채점 규칙 이식"` → push

### Task B2: 문제 묶음 로드·갱신

**Files:**
- Create: `src/core/pack.ts`, `src/data/pack-store.ts`, `scripts/sync-pack.mjs`, `assets/pack.json`(동기화 결과, 커밋함)
- Test: `src/core/__tests__/pack.test.ts`

**Interfaces:**
- Produces (`src/core/pack.ts`, 순수):
  - `parsePack(raw: unknown): AppPack | null` — `schema===1`, `version` 문자열, `questions` 배열이고 각 질문에 `key`/`type`/`kind`/`answer`/`source`가 있으면 통과, 아니면 `null`. kind별 필수: choice→`choices`(2개 이상, `answer` 포함), spacing→`answers`·`syllables`
  - `choosePack(bundled: AppPack, cached: AppPack | null): AppPack` — 캐시가 있고 유효하면 캐시, 아니면 내장
  - `PACK_BASE_URL = 'https://woorimal-contest.co.kr/app/'`
- Produces (`src/data/pack-store.ts`, 입출력):
  - `loadPack(): Promise<AppPack>` — 내장 `assets/pack.json` + `FileSystem.documentDirectory + 'pack.json'` 캐시 중 `choosePack`
  - `refreshPack(current: AppPack, fetchFn = fetch): Promise<AppPack | null>` — `version.json` 조회, 버전이 다르면 `pack.json`을 받아 `parsePack` 통과 시 임시 파일에 쓰고 이름을 바꿔 캐시 교체 후 반환. 네트워크·파싱 실패는 `null`(예외를 밖으로 내지 않음)
- `scripts/sync-pack.mjs`: `../woorimal_contest/public/app/pack.json`을 `assets/pack.json`으로 복사(없으면 오류 메시지와 종료 코드 1). `package.json`에 `"sync-pack": "node scripts/sync-pack.mjs"`

- [ ] **Step 1: 실패하는 테스트** — `pack.test.ts`:
  - 유효 묶음 → 그대로 반환; `null`·`{}`·`schema:2`·choice인데 `answer`가 `choices`에 없음 → `null`
  - `choosePack(bundled, null)` → bundled; `choosePack(bundled, valid)` → cached
  - `refreshPack`: `fetchFn`이 throw → `null`; 같은 버전 → `null`(pack.json 요청 안 함); 새 버전이지만 깨진 JSON → `null` (Review Focus 3). 파일 쓰기는 `expo-file-system`을 jest mock으로 대체
- [ ] **Step 2: 실패 확인** — `npm.cmd test -- pack` → FAIL
- [ ] **Step 3: 구현** — 위 Interfaces대로
- [ ] **Step 4: 통과 확인** — PASS
- [ ] **Step 5: 묶음 동기화** — `npm.cmd run sync-pack` → `assets/pack.json` 생성, `node -e "const p=require('./assets/pack.json');console.log(p.version,p.questions.length)"`로 확인
- [ ] **Step 6: 커밋·push** — `git commit -m "feat: 문제 묶음 내장·갱신(실패 시 기존 묶음 유지)"`

### Task B3: 한 판 진행 규칙(시간·하트·낱알)

**Files:**
- Create: `src/core/timing.ts`, `src/core/round.ts`
- Test: `src/core/__tests__/round.test.ts`

**Interfaces:**
- Consumes: `grade` (B1)
- Produces:
  - `timeLimitMs(q: AppQuestion): number` — choice: `prompt` 30자 이하 8000, 그 외 12000 / typed: 20000 / spacing: `min(25000, 6000 + 400 * syllables.length)`
  - `ROUND_SIZE = 10`, `START_HEARTS = 3`
  - `type Round = { questions: AppQuestion[]; index: number; hearts: number; streak: number; grains: number; startedAt: number /* 현재 문제 시작 시각 ms */; results: RoundResult[] }`
  - `type RoundResult = { key: string; type: string; correct: boolean; timedOut: boolean; synonymHit: boolean; userAnswer: string; elapsedMs: number; grains: number }`
  - `startRound(questions: AppQuestion[], now: number): Round`
  - `answer(round: Round, input: string | boolean[], now: number): Round` — `now - startedAt > timeLimitMs`이면 입력과 무관하게 시간 초과로 처리(Review Focus 2). 새 객체 반환
  - `timeout(round: Round, now: number): Round`
  - `remainingMs(round: Round, now: number): number` (0 이상)
  - `isOver(round: Round): boolean` — `hearts === 0 || index >= questions.length`
  - `grainsFor(correct: boolean, remainingRatio: number, streakAfter: number): number` — 정답: `round((10 + round(10 * remainingRatio)) * mult)`, `mult = streakAfter >= 5 ? 2 : streakAfter >= 3 ? 1.5 : 1`; 오답 0
  - `canSubmit(q: AppQuestion, input): boolean` — typed에서 `normalizeAnswer(input) === ''`이면 false

- [ ] **Step 1: 실패하는 테스트** — `round.test.ts`:
  - 정답 3연속 → `streak 3`, 세 번째 낱알에 1.5배 적용; 오답 → `hearts-1`, `streak 0`
  - 오답·시간 초과 3번 → `isOver` true, 남은 문제는 결과에 없음
  - 10문제 끝 → `isOver` true
  - `answer(round, 정답, startedAt + timeLimitMs + 1)` → `timedOut true`, `correct false`, 하트 감소 (백그라운드 복귀)
  - `remainingMs`가 음수가 아님; `timeLimitMs` 세 kind 값과 spacing 상한 25000
  - `canSubmit(typedQ, '  ')` → false
- [ ] **Step 2: 실패 확인** — `npm.cmd test -- round` → FAIL
- [ ] **Step 3: 구현**
- [ ] **Step 4: 통과 확인** — PASS
- [ ] **Step 5: 커밋·push** — `git commit -m "feat: 한 판 규칙(제한 시간·하트·연속 정답 낱알)"`

### Task B4: 학습 기록과 출제

**Files:**
- Create: `src/core/progress.ts`, `src/core/picker.ts`
- Test: `src/core/__tests__/picker.test.ts`

**Interfaces:**
- Consumes: `RoundResult` (B3), `AppQuestion`
- Produces:
  - `type QuestionStat = { seen: number; correct: number; lastAt: number; lastWrongAt?: number; needsReview: boolean }`
  - `type Progress = { stats: Record<string /* key */, QuestionStat>; triesByType: Record<string, number> }`
  - `emptyProgress(): Progress`
  - `recordResults(p: Progress, results: RoundResult[], now: number): Progress` — 오답·시간 초과면 `needsReview=true`, `lastWrongAt=now`; 정답이면 `needsReview=false`
  - `typeAccuracy(p: Progress, questions: AppQuestion[]): { type: string; total: number; correct: number; rate: number }[]` — 묶음에 있는 키만 집계, `rate` 오름차순(약한 유형 먼저)
  - `reviewKeys(p: Progress, questions: AppQuestion[]): string[]` — `needsReview`이고 현재 묶음에 있는 키, `lastWrongAt` 최신순 (Review Focus 4)
  - `EASY_FIRST_TRIES = 20`
  - `pickRound(questions, p, { count = 10, rng = Math.random, now }): AppQuestion[]` — ① 하루(86,400,000ms) 이상 지난 `needsReview` 문제 최대 2개 ② 나머지는 유형을 돌아가며 뽑되(웹 `pickMixed` 방식), `triesByType[type] < 20`인 유형은 `easy` 문제만 ③ 최근 푼(`lastAt`) 문제는 뒤로 미룸(아직 안 푼 문제 우선) ④ 마지막에 섞고, choice의 `choices`도 섞은 복사본 반환
  - `pickReviewRound(questions, p, { count = 10, rng }): AppQuestion[]` — `reviewKeys` 순서대로 최대 10개
- `recordResults`는 `triesByType`도 늘린다

- [ ] **Step 1: 실패하는 테스트** — `picker.test.ts`(고정 `rng`):
  - 새 사용자: 반환 10개, 모두 `easy`, 서로 다른 key, 두 유형 이상 섞임
  - `triesByType.meaning = 20` → meaning에서 easy 아닌 문제도 나옴
  - 이틀 전 틀린 문제 3개 → 최대 2개 포함; 1시간 전 틀린 문제는 일반 판에 포함 안 됨
  - 묶음에서 빠진 키가 `needsReview`여도 `reviewKeys`·`pickReviewRound`에 없고 예외 없음; 다시 풀 문제가 없으면 `pickReviewRound` → `[]`
  - `typeAccuracy`가 rate 오름차순
- [ ] **Step 2: 실패 확인** — `npm.cmd test -- picker` → FAIL
- [ ] **Step 3: 구현**
- [ ] **Step 4: 통과 확인** — PASS
- [ ] **Step 5: 커밋·push** — `git commit -m "feat: 학습 기록, 쉬운 문제 우선·틀린 문제 다시 출제"`

### Task B5: 성장(레벨·곳간)과 연속 기록

**Files:**
- Create: `src/core/growth.ts`
- Test: `src/core/__tests__/growth.test.ts`

**Interfaces:**
- Produces:
  - `xpForLevel(level: number): number` — 레벨 `level`에 도달하는 누적 낱알 = `50 * (level - 1) * level / 2` (Lv1=0, Lv2=50, Lv3=150 …)
  - `levelFor(totalGrains: number): { level: number; into: number; need: number }`
  - `BARN_STAGES = [{ from: 1, name: '초가 곳간' }, { from: 5, name: '기와 곳간' }, { from: 12, name: '큰 곳간' }]`, `barnFor(level)`
  - `type Streak = { days: number; lastDay: string | null /* 'YYYY-MM-DD' 기기 현지 날짜 */ }`
  - `localDay(date: Date): string`
  - `bumpStreak(s: Streak, today: string): Streak` — 같은 날 → 그대로; 바로 다음 날 → +1; 그보다 뒤 → 1; `today < lastDay`(날짜를 되돌림) → 그대로 (Review Focus 5)
  - `currentStreak(s: Streak, today: string): number` — `lastDay`가 오늘·어제면 `days`, 아니면 0

- [ ] **Step 1: 실패하는 테스트** — 레벨 경계(49→Lv1, 50→Lv2, 150→Lv3), `barnFor(4/5/12)`, 연속 기록: 같은 날 두 번 → 1, 다음 날 → 2, 이틀 건너뜀 → 1, 날짜 되돌림 → 변화 없음, 12월 31일→1월 1일 → +1
- [ ] **Step 2: 실패 확인** — `npm.cmd test -- growth` → FAIL
- [ ] **Step 3: 구현**
- [ ] **Step 4: 통과 확인** — PASS
- [ ] **Step 5: 커밋·push** — `git commit -m "feat: 낱알 레벨·곳간 단계·연속 기록"`

### Task B6: 저장과 앱 상태

**Files:**
- Create: `src/data/save.ts`, `src/state/GameProvider.tsx`
- Test: `src/data/__tests__/save.test.ts`

**Interfaces:**
- Consumes: `Progress`/`recordResults` (B4), `Streak`/`bumpStreak` (B5), `loadPack`/`refreshPack` (B2), `Round` (B3)
- Produces:
  - `type SaveData = { schema: 1; totalGrains: number; rounds: number; streak: Streak; progress: Progress; settings: { haptics: boolean; sound: boolean } }`
  - `SAVE_KEY = 'woorimal.save.v1'`, `loadSave(): Promise<SaveData>`(없거나 깨졌으면 기본값), `writeSave(d: SaveData): Promise<void>`
  - `finishRound(d: SaveData, round: Round, now: Date): SaveData` — 낱알 합산, `rounds+1`, `recordResults`, `bumpStreak(localDay(now))`
  - `GameProvider`/`useGame()` → `{ pack, save, startNormal(): AppQuestion[], startReview(): AppQuestion[], complete(round: Round): void, updateSettings(patch) }`. 마운트 시 `loadPack`→화면 표시, 이어서 백그라운드 `refreshPack`(성공하면 다음 판부터 새 묶음)

- [ ] **Step 1: 실패하는 테스트** — AsyncStorage jest mock 사용: 저장 없음 → 기본값; 깨진 JSON → 기본값(예외 없음); `finishRound` 후 `writeSave`→`loadSave` 왕복 시 같은 값; `finishRound`가 `totalGrains`·`rounds`·`streak.days`를 갱신
- [ ] **Step 2: 실패 확인** — `npm.cmd test -- save` → FAIL
- [ ] **Step 3: 구현**
- [ ] **Step 4: 통과 확인** — PASS
- [ ] **Step 5: 커밋·push** — `git commit -m "feat: 기기 저장과 게임 상태"`

### Task B7: 화면(홈·게임·결과·기록·설정)

**Files:**
- Create: `app/_layout.tsx`, `app/index.tsx`(홈), `app/play.tsx`, `app/result.tsx`, `app/record.tsx`, `app/settings.tsx`; `src/components/{Hearts,TimerBar,ChoiceAnswer,TypedAnswer,SpacingAnswer,SourceNote,Squirrel,Barn,GrainBurst}.tsx`
- Test: `src/components/__tests__/play.test.tsx`

**Interfaces:**
- Consumes: `useGame()` (B6), `startRound`/`answer`/`timeout`/`remainingMs`/`isOver`/`canSubmit` (B3), `levelFor`/`barnFor`/`currentStreak` (B5), `typeAccuracy` (B4)
- 화면 동작(설계 5.2):
  - 홈: 다람쥐 Lv·경험치 바·곳간 단계·`🔥 N일 연속`, `[▶ 한 판 시작]`, `[틀린 문제 다시 풀기 (N)]`(N=0이면 비활성)
  - 게임: 상단 하트·진행 `n/10`·남은 시간 바(100ms 간격 갱신, `remainingMs` 기준). 0이면 `timeout`. 정답·오답 후 정답과 해설을 1.2초 보여 주고 다음 문제(탭하면 바로 넘김). `AppState`가 active로 돌아오면 즉시 `remainingMs` 재계산. typed는 자동 포커스, `hint.chosung` 표시, 빈 입력 제출 무시. spacing은 음절 사이를 눌러 띄움 토글. `SourceNote`: `source==='kbs'`일 때만 `출처: KBS 우리말 겨루기`(작은 회색 글씨)
  - 결과: `정답 x/총` · 정답률 · 얻은 낱알 · 경험치 바 애니메이션 · 레벨업 시 다람쥐 확대 연출, 곳간 단계가 바뀌면 곳간 교체 연출 · `[다음 판]` `[틀린 문제 보기]`
  - 기록: `typeAccuracy` 목록(약한 유형 위), 누적 판 수, 연속 기록
  - 설정: 진동·효과음 켜기/끄기, 묶음 버전 표시
  - 다람쥐·곳간 그림은 1차 자리 표시자(이모지·단순 도형), 크기·단계만 바뀌게
  - 유형 표시 이름은 웹 `quiz-types.mjs` 라벨을 따름(`meaning: 뜻 보고 낱말` 등, `broadcast: 방송 문제`)
- [ ] **Step 1: 실패하는 테스트** — `play.test.tsx`(testing-library, 가짜 타이머, 고정 문제 3개를 주입):
  - kbs 문제에서 `출처: KBS 우리말 겨루기`가 보이고 original 문제에서는 안 보임
  - 오답 3번 → 결과 화면으로 이동
  - 시간을 `timeLimitMs`만큼 진행 → 하트 하나 감소
  - typed 빈 입력 제출 → 다음 문제로 넘어가지 않음
- [ ] **Step 2: 실패 확인** — `npm.cmd test -- play` → FAIL
- [ ] **Step 3: 구현**
- [ ] **Step 4: 통과 확인** — `npm.cmd test` → 전체 PASS
- [ ] **Step 5: 실기기/에뮬레이터 확인** — `npx expo start` → Android(Expo Go 또는 에뮬레이터)에서 한 판 완주, 비행기 모드에서도 시작 가능, 문제 중 홈으로 나갔다 돌아와 시간 초과 처리 확인. 확인 결과를 커밋 메시지나 README에 남김
- [ ] **Step 6: 커밋·push** — `git commit -m "feat: 홈·게임·결과·기록·설정 화면"`

### Task B8: Android 빌드 설정과 문서

**Files:**
- Modify: `app.json`(이름 `우리말 곳간`, `android.package` = `kr.co.woorimalcontest.app`, 세로 고정, 아이콘·스플래시 자리 표시자, `android.permissions: []`)
- Create: `eas.json`(`preview` = apk, `production` = aab), `README.md`, `CLAUDE.md`(이 저장소 규칙: 콘텐츠 원본은 웹 저장소, `npm run sync-pack`, 테스트 명령)

- [ ] **Step 1: 설정 작성** — 위 값으로
- [ ] **Step 2: 점검** — `npx expo-doctor` → 문제 없음, `npm.cmd test` → PASS
- [ ] **Step 3: 미리보기 빌드(사용자 계정 필요)** — `npx eas-cli build -p android --profile preview`. Expo 로그인이 필요하면 사용자에게 `! npx eas-cli login` 실행을 요청. 결과 APK 링크를 사용자에게 전달
- [ ] **Step 4: 커밋·push** — `git commit -m "chore: Android 빌드 설정과 문서"` → `git rev-parse HEAD origin/main` 일치 확인
