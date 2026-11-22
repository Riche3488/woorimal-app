# 우리말 곳간 플레이 경험 개선 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. 구현·자동 검증과 남은 수동 검수의 상태는 [실행 기록](../../2026-11-22-player-experience-implementation.md)에 기록한다. 아래 체크리스트에는 기기·사용자·국어 검수까지 포함한 전체 인수 조건이 들어 있다.

**Goal:** 중단해도 안심하고 이어 풀며, 짧은 학습의 성취가 곳간 성장과 다음 복습으로 이어지는 기존 게임 루프를 완성한다.

**Architecture:** `src/core/`의 순수 규칙과 `GameProvider` 중심 구조를 유지한다. 먼저 직렬 저장과 복구 가능한 퀴즈 세션을 만들고, 모든 학습 활동을 공통 활동 기록으로 연결해 목표·보상·수집을 계산한다. 원본 콘텐츠 보완은 웹 저장소에서 진행하며, 계정과 서버가 필요한 기능은 별도 확장으로 둔다.

**Tech Stack:** 현재 저장소의 Expo SDK 58, React Native, TypeScript, expo-router, AsyncStorage, Reanimated, expo-notifications, Jest, React Native Testing Library 14.

**Spec:** 사용자가 제공한 개선 제안과 [플레이 경험 분석](../../2026-11-22-player-experience-analysis.md). 아래의 구체적인 정책값은 구현을 위한 제안값이며, 이미 합의된 운영 수치나 실측 효과를 뜻하지 않는다.

작성일: 2026-11-22 · 확인한 코드: `bc8db4f` · 내장 묶음: `43a93208b1aa`.

## Global Constraints

- 콘텐츠 원본은 `D:\projects\woorimal_contest`의 `data/*.json`이다. 앱 저장소의 `assets/pack.json`을 직접 편집하지 않는다. 형식 변경은 두 저장소를 함께 변경한다.
- 게임 규칙은 `src/core/`의 순수 함수로 구현하고 테스트를 먼저 작성한다. 화면 테스트의 `render`와 `fireEvent`는 비동기 API로 사용한다.
- 1·2단계는 계정·광고·서버 쓰기 없이 오프라인에서 동작한다. 사용자 답안·문제 원문을 외부 분석 서비스에 보내지 않는다.
- 저장 키 `woorimal.save.v1`, `schema: 1`은 유지하고 추가 필드는 읽기 시 기본값을 채운다. 기존 낱알·레벨·연속 기록·복습·별·퍼즐을 보존한다.
- 일반 판은 최대 10문제·하트 3개를 유지한다. 복습·유형 연습·담은 문제는 하트와 제한 시간을 없앤다. 오늘의 문제는 개인화와 보기형 설정에서 제외한다.
- 복습 간격 1→3→7일, 예정일 전 정답은 단계 유지라는 규칙을 보존한다. 힌트 뒤 재시도는 독립적인 정답으로 집계하지 않는다.
- 기존 한지·다람쥐·곳간 자산을 재사용한다. 동작 줄이기 설정에서는 같은 정보를 정적인 상태 변화와 문구로 전달한다.
- Windows PowerShell 명령은 `npm.cmd`·`npx.cmd`를 사용한다. 계획 작성 단계에서는 앱 코드·데이터·배포 상태를 변경하지 않는다.

## Review Focus

1. 마지막 답 저장 직후 강제 종료 → 재실행해도 결과·낱알·미션을 두 번 반영하지 않는다. Task 2·4·9.
2. 자정·날짜 변경·묶음 교체를 걸친 복구 → 원래 문제와 보기가 유지되고, 어제의 도전 결과가 오늘 결과를 덮지 않는다. Task 3·4·9.
3. 저장 실패·손상·알 수 없는 세션 버전 → 저장 성공을 표시하거나 기존 누적 기록을 기본값으로 덮지 않는다. Task 2·4.
4. 여러 허용 답이 있는 띄어쓰기 → 허용 답 어느 것과 일치해도 오답 표시가 없고, 다른 경우 가장 가까운 허용 답과 비교한다. Task 6.
5. 복습 예정 문제·새 낱말·카드가 없는 사용자 → 하루 목표를 달성할 수 있고, 없는 활동을 필수 과제로 제시하지 않는다. Task 9·11.

## 1. 구현 방향과 릴리스 범위

새 모드마다 보상과 기록을 추가하면 현재의 활동별 인정 차이가 커진다. **복구 가능한 세션 → 공통 학습 활동 → 통합 목표와 성장** 순서로 구현한다.

| 접근 | 장점 | 비용과 판단 |
| --- | --- | --- |
| 화면별로 빠르게 수정 | 피드백·버튼 수정이 빠름 | 저장 경쟁·복구·중복 보상을 개별 화면에서 반복 처리하게 됨 |
| 기존 구조에 세션과 활동 규칙 추가 | 오프라인 구조를 유지하며 퀴즈·카드·퍼즐의 기준을 통합 | 초기 저장 정비 필요. 이 계획의 권장안 |
| 계정·서버·경쟁을 함께 도입 | 기기 간 동기화와 순위 제공 가능 | 현재 제약을 바꾸고 개발·운영 범위가 커짐. 후속 별도 설계 |

| 릴리스 | 범위와 산출물 | 선행 조건 | 완료 기준 |
| --- | --- | --- | --- |
| R0 관찰 기준 | Task 1: 사용성 시나리오·선택적 기기 내 진단 | 없음 | 비교할 지표·동의·기록 제외 항목 확정 |
| R1 기본 경험 | Task 2~7: 저장·복구·수동 피드백·입력·복습·결과 동선 | R0 기준 정의 | 중단·재시작·저장 실패 시나리오 통과. 서버·신규 모드 없이 배포 가능 |
| 콘텐츠 보완 | Task 8: 띄어쓰기 해설과 품질 검사 | 웹 저장소 작업 환경 | 표본 검수 후 순차 반영. 앱 R1 전체를 568개 작성 완료까지 막지 않음 |
| R2 짧은 성취와 성장 | Task 9~11: 통합 목표·5문제 시작·수집·꾸미기 | R1 복구와 저장 안정화 | 카드·퍼즐만으로도 목표와 연속 기록에 기여, 중복 보상 없음 |
| R3 재방문 품질 | Task 12~13: 반복 알림·로컬 적응 출제 | R2 활동 기록, 관찰 결과 | 알림 중복 없음, 풀이 방식별 성적 분리, 제한된 사용자 검증 |
| R4 진행감과 공유 | Task 14: 탐험 지도·주간 도전·비교 가능한 공유 | R3 검증 | 상세 설계를 확정한 하위 프로젝트부터 구현 |

의존 관계: `1 → 2 → 3 → 4 → {5,6,7} → 9 → {10,11} → {12,13} → 14`. Task 8은 별도 콘텐츠 작업으로 병행할 수 있다. 저장·보상·출제를 한 릴리스에서 동시에 교체하지 않는다.

### 우선순위 10개와 작업 대응

| 사용자 제안 | 구현 작업 | 범위 결정 |
| --- | --- | --- |
| P0 중단·복구 | 2~4 | 백그라운드 정지, 문제·입력·피드백 저장, 명시적 이어 하기 |
| P0 피드백 조절 | 5 | 기본 수동, 해설 펼치기, 정답 자동 진행 옵션 |
| P0 입력 부담 | 6, 10 | 시작 시 보기형 선택, 띄어쓰기 되돌리기·오답 위치, 퀵플레이 |
| P1 3분 퀵플레이 | 10 | 기존 퀴즈 엔진의 5문제 프리셋. 180초 강제 종료는 하지 않음 |
| P1 통합 데일리 미션 | 9 | 모든 모드가 하루 5개 학습 목표에 기여 |
| P1 곳간 성장 | 11 | 낱알 변화·해금·장착을 실제 저장 상태와 연결 |
| P1 복습 UX | 7, 11 | 실패로 중단하지 않는 복습, 단계와 다음 날짜 안내 |
| P1 개인화 난이도 | 13 | 로컬 독립 시도 기록부터 수집한 뒤 규칙 기반 실험 |
| P2 주간 도전·친구 비교 | 14 | 우선 동일 출제 식별자를 포함한 공유. 친구 목록·온라인 순위는 별도 |
| P2 개인화 리마인더 | 12 | 반복 예약·빈도 설정·복습 진입 연결. 닫힌 앱에서 최신 복습 수 계산을 약속하지 않음 |

## 2. 구현에 사용할 정책

### 세션과 저장

세션은 한 번에 하나만 유지한다. 홈 최상단에 `이어 하기 · 3/10`을 표시하고, 다른 판을 시작하려면 기존 판을 이어 하거나 종료하도록 안내한다. 종료해도 이미 확정된 학습 기록은 남으며, 미완료 판의 낱알·완료 횟수는 지급하지 않는다. 뒤로 가기는 `멈추고 홈으로`·`계속 풀기`를 제공하고, 별도 종료는 `이 판 끝내기`로 구분한다.

입력 중 초안은 300ms 지연 저장과 화면 이탈 시 저장을 시도한다. **제출 결과·피드백 전환·다음 문제 진입·판 완료는 즉시 저장**한다. 갑작스러운 종료에서는 마지막 저장 성공 지점까지 복구하며, 마지막 키 입력까지 무조건 보존한다고 안내하지 않는다. 틱마다 저장하지 않는다.

`inactive`·`background`·화면 이탈 때 풀이 시간과 자동 진행을 멈춘다. 복귀·재실행 시 `이어서 풀기`를 누를 때 재개한다. 풀이 시간은 전경에서 실행된 시간만 누적하며 기기 시각 변경에 영향받지 않는 실행 중 시계를 사용한다. 복습일·학습일 계산에는 별도로 실제 기기 날짜를 사용한다.

문제별 학습 기록은 최초 판정 저장 시 반영한다. 판 종료 때는 이미 기록된 결과를 다시 `recordResults`에 넣지 않고 낱알·완료 횟수·결과 요약만 확정한다. 활성 세션과 해당 갱신을 같은 저장 객체에 넣어 한 번에 기록한다. `sessionId`와 처리한 결과 수, 완료 영수증으로 재호출을 무해하게 만든다.

### 모드·입력·피드백

| 모드 | 길이 | 하트·시간 | 재시도와 다음 행동 |
| --- | --- | --- | --- |
| 일반 | 최대 10 | 하트 3, 기존 문제별 시간 | 판정 뒤 해설. 결과에서 일반 다음 판 |
| 오늘의 문제 | 최대 5 | 하트 숨김, 기존 문제별 시간 | 공통 출제 유지. 결과에서 공유·다른 학습 안내 |
| 복습·담은 문제·유형 연습 | 최대 10 | 하트 없음, 시간 초과 없음 | 최초 오답 후 도움받아 1회 재시도 또는 정답 보기. 같은 모드 이어 하기 |
| 퀵플레이 | 기본 5, 부족하면 3~4 | 하트 없음, 시간 초과 없음 | 보기형만 출제. 결과에서 같은 길이 다시 시작 |

정답·오답 모두 기본 수동 넘김이다. 자동 진행을 켜면 **정답만 3초 후** 이동하며 해설 펼치기·별·신고를 누르면 해당 문제의 자동 진행을 취소한다. 다음 버튼을 명시적으로 분리해 해설·별을 누르다 넘어가는 일을 막는다. 해설은 요약 4줄과 `해설 더 보기`를 제공한다.

일반 판 시작 전 `보기로 풀기`·`직접 입력`을 선택할 수 있게 하고 기존 설정을 기억한다. 기존 사용자의 선택을 보존하며 처음 설치한 사용자는 보기형을 먼저 제안한다. 보기를 안전하게 구성할 수 없는 문제는 일반 판에서는 직접 입력으로 남고, 퀵플레이에서는 제외한다. 시작 후 보기·순서를 바꾸지 않는다.

복습 재시도에서는 최초 판정만 독립 성적·간격 복습에 반영한다. 오답 뒤 맞힌 답은 `도움받아 해결`로 표시하고, 정답률·숙련 단계·낱알·미션을 추가로 올리지 않는다. 띄어쓰기는 재시도 전에 잘못된 위치를 보여 주고, 완성된 정답은 정답 보기 또는 재시도 종료 때 공개한다. 규칙 해설이 없는 문제에 그럴듯한 설명을 자동 생성하지 않는다.

### 하루 목표와 보상

첫 구현의 목표는 **현지 날짜 기준 서로 다른 학습 항목 5개**다. 1·3·5개에서 세 개의 진행 표시를 채운다. 홈에는 `오늘 3/5개 · 목표 2/3단계`처럼 단위를 명시한다. 사용자가 제안한 퀴즈·카드·복습 세 가지를 모두 의무화하는 방식은 복습이나 카드가 없는 날의 달성을 막으므로 후속 실험으로 남긴다.

| 활동 | 유효 학습 1개 조건 | 중복 식별 |
| --- | --- | --- |
| 모든 퀴즈 모드 | 빈 답이 아닌 독립 답 제출. 오답도 인정 | `q:<question.key>` |
| 오늘의 낱말 | 확인 문제의 첫 답 제출. 카드 열람만으로는 인정하지 않음 | 연결된 퀴즈와 같은 `q:<question.key>` |
| 가로세로 퍼즐 | 직접 제출해 낱말 해결. 초성 도움 사용도 인정 | 판이 달라도 같은 낱말은 `cw:<normalizeAnswer(word)>` |
| 재시도·건너뛰기 | 힌트 뒤 답·시간 초과·모르겠어요·자동 교차 완성은 추가 인정하지 않음 | 원래 항목 유지 |

같은 문항의 보기형·입력형·카드 재노출은 당일 1개다. 다른 유형의 별도 문항과 퍼즐 낱말은 별도 학습으로 인정하며, 이 수치를 서로 다른 낱말 수라고 부르지 않는다. 첫 유효 학습부터 연속 기록을 잇는다. 기존 판 수는 누적 통계로 보존하지만 하루 목표 계산에서는 뺀다. 목표를 채우면 종료 인사를 우선하고 추가 학습은 선택으로 둔다.

R1은 기존 보상 공식을 유지한다. R2에서 새로 시작한 학습 세션은 `learning-v2` 보상을 사용한다. 퀴즈·카드의 독립 정답은 기본 10낱알, 처음 푼 문항이면 +5, 판정 전 복습 예정일에 도달한 문항이면 +5다. 당일 같은 식별자의 반복 보상은 0이며 속도·연속 정답 배수는 적용하지 않는다. 오답·힌트 뒤 정답은 0이다. 퍼즐은 기존 5낱알·초성 사용 3낱알을 유지하되 당일 같은 낱말의 반복 지급은 막는다. 정답 연속 연출은 유지할 수 있으나 낱알 배수로 표시하지 않는다.

퀴즈 낱알은 판 완료 때, 카드·퍼즐 낱알은 해당 활동 저장 때 확정한다. 퀴즈 도중에는 `이번 판 예상 낱알`로 표시한다. 하루 목표 달성 보너스는 별도 낱알 대신 장식 해금으로 시작해 레벨 곡선을 한꺼번에 크게 바꾸지 않는다. 기존 누적 낱알과 레벨 기준은 소급 변경하지 않는다. 업데이트 전 시작한 판은 저장된 보상 버전으로 마친다.

### 성장·수집·내일의 목표

곳간 레벨과 낱말 숙련을 구분한다. 도감은 `발견한 낱말`과 `복습을 마친 낱말`을 함께 보여 주어 항상 맞히는 사용자도 발견을 확인할 수 있게 한다. 기존 `known`·`mastered`를 바탕으로 시작하고, 카드·퍼즐에서 직접 익힌 낱말도 발견에 연결한다. 도감 수집 조건 때문에 일부러 틀리도록 유도하지 않는다.

초기 장식은 세 개의 고정 해금으로 제한한다: 첫 하루 목표 달성 `나뭇잎 깃발`, 발견 10낱말 `낱말 팻말`, 간격 복습을 마친 5낱말 `도토리 바구니`. 조건을 충족하면 한 번 지급하고 장착·해제를 저장한다. 기존 사용자도 현재 기록으로 조건을 평가한다. 무작위 지급·상점·재화 소비·새 지역 제작은 첫 범위에서 제외한다.

홈 우선순위는 `진행 중 판 → 오늘 목표 → 복습 3개 또는 짧은 시작 → 선택 모드`다. 복습 추천은 오늘 예정 문제가 있으면 최대 3개, 없으면 퀵플레이를 제안한다. 결과에서는 같은 모드 이어 하기와 함께 `내일 복습 N개`를 보여 준다. 오늘의 문제 완료 뒤에는 같은 도전을 다시 보상하는 버튼을 두지 않는다.

## 3. 파일과 데이터 경계

아래 `신규` 경로는 구현할 파일이다. 실제 구현 시 기존 파일의 역할을 유지하고 아래 이름으로 인터페이스를 맞춘다.

| 경로 | 책임 |
| --- | --- |
| `src/core/session.ts` 신규 | `RoundMode`, `RoundPolicy`, `SessionSnapshot`, 세션 상태 전이·입력 초안·일시정지 |
| `src/core/session-commit.ts` 신규 | 세션 체크포인트·학습 기록·완료 영수증의 멱등 갱신 |
| `src/core/round.ts` 수정 | 하트·시간을 모드 정책으로 선택. 기존 채점 함수 재사용 |
| `src/data/save.ts`, `src/data/save-store.ts` 신규 | 필드 정규화, 오류 구분, 모든 저장 변경의 직렬 실행 |
| `src/state/GameProvider.tsx`, `src/state/usePlaySession.ts` 신규 | 영속 세션 소유·실행 시계·AppState·화면과 저장 연결 |
| `src/components/PlayScreen.tsx`, `src/components/QuizFeedback.tsx` 신규 | 세션 표시·피드백·조작. 판의 독립적인 원본 상태를 화면에 중복 보유하지 않음 |
| `src/core/spacing-feedback.ts`, `src/core/input-history.ts` 신규 | 허용 답별 오답 자리 계산, 입력 되돌리기 |
| `src/core/activity.ts`, `src/core/rewards.ts` 신규 | 공통 학습 활동, 당일 중복 방지, 목표·보상 정책 |
| `src/core/goals.ts`, `src/core/collection.ts` 수정, `src/core/decorations.ts` 신규 | 목표 진행, 낱말 발견·숙련, 장식 해금·장착 |
| `src/core/quick-play.ts` 신규 | 기존 출제기·보기 변환을 조합하는 짧은 판 |
| `src/core/experience-events.ts`, `src/data/experience-events.ts` 신규 | 선택적 진단 이벤트·기기 내 저장·사용자 내보내기 |
| `src/core/adaptive-picker.ts` 신규 | 풀이 방식별 최근 독립 시도에 따른 출제 |
| `src/core/reminder.ts`, `src/data/reminder.ts` 수정 | 빈도별 반복 계획과 소유한 알림 예약만 교체 |
| `src/app/index.tsx`, `play.tsx`, `result.tsx`, `notebook.tsx`, `card.tsx`, `puzzle.tsx`, `collection.tsx`, `settings.tsx` | 각 화면에서 공통 세션·활동·성장 규칙 사용 |

주요 저장 추가 필드는 `activeSession`, `lastOutcome`, `activity`, `rewardLedger`, `discoveries`, `decorations`이다. 세션은 `id`, `revision`, `context`, `policy`, `round`, `phase`, `draft`, `questionElapsedMs`, `feedbackElapsedMs`, `autoAdvanceCancelled`, `paused`, `recordedCount`를 가진다. `context`는 `mode`, 선택적인 `practiceType`, 시작 날짜 `day`, `packVersion`, `rulesVersion`을 가진다. 실제 출제한 문제 객체와 섞인 보기도 함께 보존해 묶음 변경 후 다시 추첨하지 않는다. 재시도 입력·도움 여부도 세션에 보존한다.

작업 간 공유하는 타입의 기준은 다음과 같다. 기존 `Round`와 `AppQuestion`은 재사용한다.

```ts
type RewardPolicy = 'legacy-v1' | 'learning-v2';
type RoundPolicy = {
  hearts: number | null; timed: boolean; retry: boolean;
  autoAdvanceCorrectMs: 3000 | null; rewardPolicy: RewardPolicy;
};
type SessionPhase = 'question' | 'feedback' | 'retry' | 'ready-to-finish';
type SessionContext = {
  mode: RoundMode; practiceType?: QuestionType;
  day: string; packVersion: string; rulesVersion: string;
};
type ActivityState = {
  day: string; contentIds: string[]; migratedComplete: boolean;
};
type ReminderSettings = {
  frequency: 'off' | 'daily' | 'three-per-week'; hour: 8 | 12 | 19 | 21;
};
type ReminderPlan = {
  id: string; weekday?: number; hour: number; title: string; body: string;
};
type ResultAction = {
  label: string; target: 'play' | 'home' | 'share';
  mode?: RoundMode; practiceType?: QuestionType;
};
type LearningAction = ResultAction & { resumeSessionId?: string; count?: number };
```

`RoundResult.answeredAt?: number`를 추가하고 세션의 최초 판정 액션에서 실제 시각을 넣는다. 이전 저장에 없는 값은 해당 판의 저장 시각을 사용한다. `activity`는 날짜별 `ActivityState`를 최근 30일간 유지한다. 보상 중복 식별은 최근 30일과 활성 세션이 참조하는 날짜를 보존하며, 이를 넘어선 과거 제출은 새 보상 입력으로 재생하지 않는다.

`SessionOutcome`에는 세션 식별자·맥락·판 결과·완료 시각·보상 전후 낱알·새 숙련/해금 요약을 보관한다. 화면 재진입은 저장된 결과를 표시할 뿐 보상을 재실행하지 않는다. 완료 영수증은 최근 30개를 보관하고, 영수증에 없는 오래된 세션도 현재 활성 세션과 일치하지 않으면 확정할 수 없게 한다. 사용자 답안은 기존 기기 저장 범위에만 남긴다.

## 4. 실행 작업

각 코드 작업은 아래 테스트를 먼저 추가해 실패를 확인한 다음 구현하고 같은 명령으로 통과시킨다. Task 끝에는 명시한 파일만 검토해 커밋한다. 게시·출시는 마지막 검증 절차 이후의 작업이다.

### Task 1. 비교 기준과 기기 내 진단

**Files:** 신규 `src/core/experience-events.ts`, `src/data/experience-events.ts`, `src/core/__tests__/experience-events.test.ts`, `src/data/__tests__/experience-events.test.ts`; 수정 `src/app/settings.tsx`; 신규 `docs/player-experience-validation.md`.

**Interfaces:** `ExperienceEvent`는 이벤트 종류·판/세션 식별자·시각·모드·풀이 방식·규칙/묶음 버전·번호·정오답·도움 여부·전경 풀이 시간만 허용한다. `recordExperienceEvent(event: ExperienceEvent): Promise<void>`, `setExperienceDiagnostics(enabled: boolean): Promise<void>`, `clearExperienceDiagnostics(): Promise<void>`를 제공한다. 입력 답·문제 문장·광고/계정 식별자는 허용하지 않는다.

- [ ] `disabled_records_nothing`, `rejects_answer_and_prompt_fields`, `duplicate_event_id_is_ignored`, `retention_is_30_days_and_at_most_2000_events`, `disable_clears_buffer` 테스트를 추가한다.
- [ ] `npm.cmd test -- --runInBand experience-events`로 실패 확인 후 기본 꺼짐·수동 내보내기·삭제를 구현하고 PASS를 확인한다. 자동 업로드는 추가하지 않는다.
- [ ] 신규 사용자 5명 이상을 대상으로 첫 판·띄어쓰기·중단 복귀·해설·복습의 관찰 절차와 개선 전 기록 양식을 문서화한다. 만족도 향상이나 D7 효과는 이 인원으로 확정하지 않는다.
- [ ] 설정 화면에서 켜기·끄기·삭제·내보내기 문구와 실제 파일 내용을 확인하고 작업 단위로 커밋한다.

### Task 2. 저장 직렬화와 실패 구분

**Files:** 수정 `src/data/save.ts`, `src/state/GameProvider.tsx`, `src/components/ErrorScreen.tsx`; 신규 `src/data/save-store.ts`, `src/data/__tests__/save-store.test.ts`; 수정 `src/data/__tests__/save.test.ts`.

**Interfaces:** `loadSaveResult(): Promise<SaveLoadResult>`는 `missing | loaded | invalid | io-error`를 구분한다. `createSaveStore(initial: SaveData, write: (next: SaveData) => Promise<void>): SaveStore`; `SaveStore.update(reduce: (latest: SaveData) => SaveData): Promise<SaveData>`와 `flush(): Promise<void>`를 제공한다. Provider의 별·설정·카드·퍼즐·초기화까지 모두 같은 저장 큐를 사용한다.

- [ ] `writes_are_serial_and_use_latest_state`에서 지연된 별 저장과 판 저장을 겹쳐 최종 별·성적이 모두 남음을 검증한다. `failed_write_does_not_advance_committed_state`, `retry_applies_once`, `invalid_or_io_error_never_overwrites_with_defaults`도 추가한다.
- [ ] `npm.cmd test -- --runInBand save`로 실패를 확인하고 큐·재시도·로드 결과 구분을 구현한 뒤 PASS를 확인한다. 저장 부작용을 React 상태 updater 안에서 실행하지 않는다.
- [ ] 손상된 원문은 복구용으로 보존하고 재시도 또는 명시적 초기화 전까지 덮어쓰지 않는다. 세션 필드만 손상된 경우 해당 세션만 격리하고 유효한 누적 기록을 보존한다.
- [ ] 저장 실패 시 `저장하지 못했어요 · 다시 시도`를 표시한다. 읽기 실패 상태에서 새 게임을 시작하지 않으며, 실제 저장 범위에 맞게 오류 문구를 변경하고 커밋한다.

### Task 3. 정책을 가진 세션 상태와 전경 시계

**Files:** 신규 `src/core/session.ts`, `src/core/__tests__/session.test.ts`; 수정 `src/core/round.ts`, `src/core/__tests__/round.test.ts`, `src/data/save.ts`, `src/components/PlayScreen.tsx`(하트가 `null`일 때 숨기는 타입 대응).

**Interfaces:** `policyFor(mode: RoundMode, opts?: { autoAdvanceCorrect?: boolean; rewardPolicy?: RewardPolicy }): RoundPolicy`; `createSession(questions: AppQuestion[], context: SessionContext, now: number, id: string, policy: RoundPolicy): SessionSnapshot`; `reduceSession(session: SessionSnapshot, action: SessionAction): SessionSnapshot`. 액션은 `draft`, `tick(deltaMs)`, `pause`, `resume`, `answer(input, answeredAt)`, `giveup(answeredAt)`, `next`, `retry(input)`, `reveal`, `cancelAutoAdvance`로 한정한다. 기본 정책은 수동 진행·`legacy-v1`이며 Task 9에서 새 보상 버전을 선택한다. `RoundMode`는 core로 옮기고 기존 data 경로에서는 재수출한다.

- [ ] `background_30_minutes_preserves_remaining_15_seconds`, `feedback_does_not_spend_next_question_time`, `clock_rollback_does_not_add_time`, `review_has_no_hearts_or_timeout`, `double_submit_has_one_result`, `snapshot_roundtrip_preserves_draft_choices_and_phase`를 추가한다.
- [ ] `npm.cmd test -- --runInBand session round`로 실패 확인 후 상태 전이를 구현하고 PASS를 확인한다. `questionElapsedMs`에만 전경 경과를 누적하며 저장하지 않는 단조 시계 기준점은 훅이 관리한다.
- [ ] `Round.hearts`를 `number | null`로 확장하고 `Round.policy?: { timed: boolean }`를 보관한다. `startRound(questions, now, hearts: number | null = 3, policy?: { timed: boolean }): Round`로 기존 호출을 호환한다. 하트 없음은 차감·하트 종료를 건너뛰고, 시간제한 없음은 제한 시간을 넘겨도 오답으로 바꾸지 않는다. R1의 무제한 학습 모드는 속도 가산 없이 기존 기본 낱알·연속 배수만 사용한다.
- [ ] 기존 `answer`·`timeout`에는 `round.startedAt + questionElapsedMs`를 전달해 활성 풀이 시간으로 채점한다. 학습일용 `answeredAt`은 실제 시각으로 별도 보존한다. 정지·피드백 중에는 제출과 시간 초과를 처리하지 않는다.
- [ ] 세션 파서가 버전·인덱스·문항 수·시간·결과 수를 검증하도록 하고, 기존 하트 3개·10문제·채점 회귀 검증 후 커밋한다.

### Task 4. 자동 저장·복구·완료의 중복 방지

**Files:** 신규 `src/core/session-commit.ts`, `src/core/__tests__/session-commit.test.ts`, `src/state/usePlaySession.ts`, `src/components/__tests__/play-resume.test.tsx`; 수정 `src/state/GameProvider.tsx`, `src/data/save.ts`, `src/components/PlayScreen.tsx`, `src/app/index.tsx`, `src/app/play.tsx`, `src/app/result.tsx`, `src/app/_layout.tsx`, `src/components/__tests__/play-race.test.tsx`.

**Interfaces:** `checkpointSession(save: SaveData, session: SessionSnapshot): SaveData`는 새 최초 판정만 기록한다. `commitSession(save: SaveData, sessionId: string, completedAt: number): SaveData`는 완료 영수증을 만들고 활성 세션을 비운다. `usePlaySession()`은 `session`, `dispatch`, `saveStatus`, `retrySave`를 제공한다. Provider는 저장 성공 뒤에만 다음 문제·결과 이동을 확정한다.

- [ ] `last_feedback_survives_restart`, `commit_twice_grants_once`, `crash_after_commit_before_navigation_shows_saved_result`, `checkpoint_then_finish_records_answer_once`, `star_during_play_survives`, `failed_submit_save_blocks_next`를 추가한다.
- [ ] `challenge_cross_midnight_keeps_start_day`, `old_challenge_does_not_replace_newer_day`, `pack_refresh_keeps_frozen_question_and_choices`, `new_round_requires_resolving_active_session`, `kill_before_write_restores_last_acknowledged_checkpoint`도 추가한다.
- [ ] `stale_draft_cannot_overwrite_submitted_feedback`, `slow_writes_coalesce_drafts_but_keep_submissions`도 추가한다. 같은 세션의 오래된 `revision`은 무시하고, 저장이 밀리면 초안은 최신 것으로 합치되 제출·완료 저장은 생략하지 않는다.
- [ ] `npm.cmd test -- --runInBand session-commit play-resume play-race save`로 실패 확인 후 즉시 체크포인트·300ms 초안 저장·AppState 정지·뒤로 가기·홈 복구 CTA를 연결하고 PASS를 확인한다.
- [ ] `finishRound`의 성적 재집계를 제거하거나 새 경로와 분리한다. 완료 처리는 활성 세션 id가 맞을 때만 실행한다. 도전 완료는 시작일별 최근 기록을 남기고 현재 `challenge`의 더 최신 날짜를 덮지 않는다. 공유 날짜도 해당 결과의 맥락을 쓴다.
- [ ] `session_started/paused/resumed/finished/abandoned`, `answer_submitted`, `save_failed`를 Task 1 어댑터에 연결한다. `save_failed`는 저장 큐를 다시 호출해 무한 오류를 만들지 않게 별도 진단 버퍼에 기록한다. Android 전화·앱 전환·강제 종료·재실행을 실제로 확인하고 커밋한다.

### Task 5. 읽을 시간을 보장하는 피드백

**Files:** 신규 `src/components/QuizFeedback.tsx`, `src/components/__tests__/quiz-feedback.test.tsx`; 수정 `src/components/PlayScreen.tsx`, `src/app/settings.tsx`, `src/data/save.ts`, `src/components/__tests__/play.test.tsx`.

**Interfaces:** 설정에 `autoAdvanceCorrect: boolean`을 추가하고 누락 시 `false`로 채운다. `QuizFeedback`은 `onNext`, `onExpand`, `onToggleStar`, `onReport`를 각각 받는다. 자동 진행 상태는 Task 3 세션에 반영한다.

- [ ] `default_waits_after_10_seconds`, `auto_correct_advances_after_3000ms`, `wrong_never_auto_advances`, `expand_or_star_or_report_cancels_auto`, `feedback_controls_do_not_trigger_next`, `background_cancels_pending_advance`를 추가한다.
- [ ] `npm.cmd test -- --runInBand quiz-feedback play`로 실패 확인 후 독립 다음 버튼·해설 펼침·설정·저장 마이그레이션을 구현하고 PASS를 확인한다. 자동 진행 취소는 해당 피드백에만 적용한다.
- [ ] 피드백 안에서는 문제 타이머를 숨기거나 정지 상태로 표시한다. TimerBar에는 정수 남은 초와 접근성 값을 제공하고 매 틱 화면 낭독이 반복되지 않게 한다.
- [ ] 긴 해설·큰 글꼴·화면 낭독·동작 줄이기를 확인하고 `feedback_opened/expanded/continued` 이벤트 연결 후 커밋한다.

### Task 6. 보기형 진입과 띄어쓰기 조작

**Files:** 신규 `src/core/spacing-feedback.ts`, `src/core/input-history.ts`, 각 `__tests__` 테스트; 수정 `src/components/answers.tsx`, `src/core/choices.ts`, `src/app/index.tsx`, `src/app/play.tsx`, `src/components/__tests__/spacing-answer.test.tsx`, `src/core/__tests__/choices.test.ts`.

**Interfaces:** `spacingFeedback(input: boolean[], answers: string[]): { target: boolean[]; wrongIndices: number[] }`는 가장 적은 수정이 필요한 허용 답을 택한다. 동률이면 원래 답 순서를 따른다. `undoGaps(history: boolean[][]): boolean[][]`는 마지막 조작만 되돌린다. 답 입력 컴포넌트는 `value: AnswerInput`, `onChange(value)`를 받아 초안을 세션에 보관한다.

- [ ] `accepts_every_allowed_spacing_answer`, `chooses_nearest_allowed_answer`, `punctuation_and_wrapped_lines_keep_gap_indices`, `undo_restores_only_last_edit`, `restored_draft_is_visible`, `choice_conversion_excludes_other_valid_answers`를 추가한다.
- [ ] `npm.cmd test -- --runInBand spacing-answer spacing-feedback input-history choices`로 실패 확인 후 되돌리기·초기화·선택된 자리 강조·문장 비교를 구현하고 PASS를 확인한다. 오답 위치 계산은 제출 뒤에만 사용한다.
- [ ] 좁은 틈의 `hitSlop`을 겹치게 늘리는 대신, 현재 선택한 자리의 앞뒤 이동·띄움 토글을 48dp 이상 버튼으로 제공한다. 색 외에도 `3번째 글자 뒤: 붙여 쓰기`처럼 위치와 상태를 읽어 준다. 기존 글자 터치는 보조 조작으로 유지한다.
- [ ] 첫 설치의 보기형 제안과 기존 설정 보존을 연결한다. Android 한글 조합 입력·키보드 가림·폭 360·큰 글꼴·줄바꿈·문장부호에서 의도한 자리만 바뀌는지 확인하고 커밋한다.

### Task 7. 끝까지 하는 복습과 모드에 맞는 결과

**Files:** 수정 `src/core/session.ts`, `src/core/progress.ts`, `src/app/notebook.tsx`, `src/app/result.tsx`, `src/ui/navigation.ts`; 신규 `src/core/result-actions.ts`, `src/core/__tests__/result-actions.test.ts`; 수정 `src/core/__tests__/progress.test.ts`, `src/components/__tests__/notebook.test.tsx`; 신규 `src/components/__tests__/review-play.test.tsx`.

**Interfaces:** `resultAction(context: SessionContext, available: { due: number; review: number; starred: number }): ResultAction`은 버튼 문구·대상 mode·선택적인 type을 돌려준다. 복습 도움 재시도는 최초 결과를 바꾸지 않는 Task 3의 `retry` 액션을 사용한다.

- [ ] `three_wrong_answers_do_not_end_review_or_practice`, `retry_correct_keeps_first_wrong_and_box1`, `early_correct_does_not_advance_box`, `due_independent_correct_advances_once`, `practice_result_keeps_type`, `challenge_result_offers_share_not_replay_reward`, `empty_review_offers_home`를 추가한다.
- [ ] `npm.cmd test -- --runInBand review-play progress notebook result-actions`로 실패 확인 후 하트·타이머 없는 학습 모드, 도움 재시도, 결과 CTA를 연결하고 PASS를 확인한다.
- [ ] 현재 노트에 이미 있는 단계 점·상대 날짜를 유지하면서 `다음 복습 11월 26일`과 `예정일 전에 맞히면 단계가 유지돼요`를 추가한다. 정오답 모두 마지막 피드백을 읽은 뒤 결과로 간다.
- [ ] 세션 결과에 최초 정답 수와 도움받아 해결한 수를 분리해 표시하고 커밋한다.

### Task 8. 띄어쓰기 해설 568개 보완

**Files:** 별도 웹 저장소의 `data/app-adapted/spacing.json`, `scripts/lib/app-adapt.mjs`, `scripts/lib/app-pack.mjs`; 신규 웹 `scripts/check-spacing-explanations.mjs`, `scripts/check-spacing-explanations.test.mjs`; 앱에서는 검증된 빌드 결과를 `scripts/sync-pack.mjs`로 동기화한다.

**Interfaces:** 우선 기존 `AppQuestion.explain: string`에 `핵심 규칙 한 줄 + 허용 정답을 설명하는 예문`을 넣어 현재 앱과 호환한다. 위치별 구조화 해설이 필요해지면 별도 묶음 형식 변경으로 설계한다. 오답 위치 자체는 Task 6이 현재 허용 답에서 계산한다.

- [ ] 웹 검사에 `all_answer_variants_match_syllables`, `new_spacing_items_require_explanation`, `missing_explanation_count_never_increases`를 추가하고 `node --test scripts/check-spacing-explanations.test.mjs`로 실패를 확인한다.
- [ ] 검토용 20문항을 먼저 작성해 규칙 정확성·예문·복수 허용 답과의 일치를 국어 검수자가 확인한다. 작성/검수에 걸린 시간으로 남은 분량을 추정한다. 미검수 자동 생성문을 완성 해설로 집계하지 않는다.
- [ ] 앱에서 실제 출제되는 쉬운 문장부터 `20 → 100 → 전체 누락분`으로 반영하고 묶음을 다시 집계한다. 568은 기준 묶음의 누락 수이므로 완료 수는 현재 배포 묶음 기준으로 판정한다.
- [ ] 웹에서 `node scripts/check-spacing-explanations.mjs`·`npm.cmd run build`, 앱에서 `npm.cmd run sync-pack`·`npm.cmd test -- --runInBand pack grading testmode`를 통과시킨다. 허용 답·키가 바뀌지 않았음을 비교하고, 콘텐츠와 앱 동기화를 각각 검토 가능한 변경으로 남긴다.

### Task 9. 공통 활동·통합 하루 목표·보상

**Files:** 신규 `src/core/activity.ts`, `src/core/rewards.ts`, `src/core/__tests__/activity.test.ts`, `src/core/__tests__/rewards.test.ts`; 수정 `src/core/goals.ts`, `src/core/growth.ts`, `src/core/session-commit.ts`, `src/data/save.ts`, `src/state/GameProvider.tsx`, `src/app/card.tsx`, `src/app/puzzle.tsx`, `src/app/index.tsx`, `src/app/result.tsx`; 수정 기존 goals·save·puzzle·stage3 테스트.

**Interfaces:** `LearningActivity`는 문자열 `id`·`contentId`, `source: 'quiz' | 'card' | 'crossword'`, 숫자 `occurredAt`, 불리언 `correct`·`assisted`·`usedHint`·`timedOut`·`gaveUp`·`autoFilled`·`firstSeen`·`dueBeforeAnswer`를 가진다. 도감 대상은 선택적인 `word: string`으로 전달한다. `applyActivity(save: SaveData, activity: LearningActivity): SaveData`는 유효 학습·연속 기록·발견을 갱신한다. `dailyProgress(activity: Record<string, ActivityState>, day: string): { learned: number; milestones: number; complete: boolean }`; `rewardForActivity(activity: LearningActivity, policy: RewardPolicy): number`. 최초 판정 전 기록에서 `firstSeen`·`dueBeforeAnswer`를 확정하며, 정답인 경우에만 낱말을 발견으로 기록한다. 퀴즈 보상 확정은 Task 4의 완료 처리에 합친다.

- [ ] `card_and_puzzle_only_can_complete_five`, `milestones_are_1_3_5`, `same_question_across_card_and_quiz_counts_once`, `same_puzzle_word_across_boards_counts_once`, `wrong_answer_counts_but_skip_timeout_retry_do_not`, `first_valid_activity_continues_streak`를 추가한다.
- [ ] `fresh_correct_is_15`, `due_correct_is_15`, `same_day_repeat_reward_is_zero`, `slow_and_fast_correct_have_equal_reward`, `crossword_hint_is_3`, `commit_replay_does_not_grant_again`, `pre_update_session_keeps_legacy_reward_policy`를 추가한다.
- [ ] `activity_cross_midnight_uses_each_answer_day`, `old_save_keeps_grains_rounds_streak_and_boxes`, `no_due_no_cards_still_completes_goal`도 추가한다. 당일 개수는 각 답의 실제 제출일로 계산하고 판 완료 보상일과 구분한다.
- [ ] `npm.cmd test -- --runInBand activity rewards goals save puzzle stage3 session-commit`로 실패 확인 후 모든 모드의 확정 경로에서 공통 함수를 호출하고 PASS를 확인한다. 기존 `finishRound`·`finishCard`·`saveCrossword`의 중복 연속 기록·목표 갱신을 제거한다.
- [ ] `rewardLedger`에는 아직 완료하지 않은 퀴즈의 보상 예약도 기록해 다른 활동으로 같은 항목을 재지급하지 않는다. 판을 명시적으로 끝내면 미지급 예약을 해제하되 이미 인정된 학습 개수는 유지한다. 활성 세션의 당일 식별자는 완료·종료까지 보존한다.
- [ ] 오늘 이전 활동은 소급 보상하지 않는다. 기존 `daily.rounds`는 통계로 남기고 새 목표는 첫 적용일에 시작한다. 적용일에 이미 완료한 판·카드·퍼즐이 있으면 그날 목표를 달성 상태로 이월해 목표를 빼앗지 않는다. 마이그레이션·보상 전후를 확인하고 커밋한다.

### Task 10. 기존 엔진으로 5문제 퀵플레이

**Files:** 신규 `src/core/quick-play.ts`, `src/core/__tests__/quick-play.test.ts`; 수정 `src/core/session.ts`, `src/core/result-actions.ts`, `src/state/GameProvider.tsx`, `src/app/index.tsx`, `src/app/play.tsx`, `src/app/result.tsx`; 신규 `src/components/__tests__/quick-play.test.tsx`.

**Interfaces:** `pickQuickRound(bank: AppQuestion[], progress: Progress, opts: { now: number; rng: () => number }): AppQuestion[]`. `RoundMode`에 `quick`을 추가하고 Task 3·4의 같은 세션을 사용한다.

- [ ] `five_choice_questions_with_distinct_answers`, `no_spacing_or_unconvertible_typed_question`, `due_question_limit_is_one`, `fewer_than_five_returns_three_or_four`, `fewer_than_three_hides_entry`, `result_restarts_quick`, `quick_progress_uses_common_activity_rules`를 추가한다.
- [ ] `npm.cmd test -- --runInBand quick-play result-actions`로 실패 확인 후 안전하게 보기형으로 만들 수 있는 후보를 먼저 구성하고 기존 picker의 유형 균형·낱말 중복 방지를 재사용한다. 쉬운 문제·미출제·예정 복습 최대 1개를 우선하고 PASS를 확인한다.
- [ ] 홈 기본 CTA는 `가볍게 5문제`, 보조 문구는 `약 3분 · 시간제한 없음`으로 둔다. 3~4개만 있으면 실제 개수를 표시한다. 일반 10문제와 오늘의 문제는 별도 선택으로 유지한다.
- [ ] 실제 풀이 시간의 중앙값·90백분위를 관찰한다. 해설을 수동으로 읽으므로 3분 이내 완료를 보장하지 않는다. 관찰 결과에 따라 3문제 기본값이나 문구 변경을 판단하고 커밋한다.

### Task 11. 성장·도감·다음 행동 연결

**Files:** 신규 `src/core/decorations.ts`, `src/core/__tests__/decorations.test.ts`, `src/components/DailyMission.tsx`, `src/components/BarnDecorations.tsx`, `src/components/__tests__/daily-loop.test.tsx`; 수정 `src/core/goals.ts`, `src/core/collection.ts`, `src/core/__tests__/collection.test.ts`, `src/data/save.ts`, `src/app/index.tsx`, `src/app/result.tsx`, `src/app/collection.tsx`, `src/components/art.tsx`, `src/components/bits.tsx`; 신규 `docs/design/player-growth-rewards.md`.

**Interfaces:** `decorations.ts`에서 `evaluateUnlocks(save: SaveData): DecorationId[]`, `equipDecoration(save: SaveData, id: DecorationId | null): SaveData`를 제공하고, `goals.ts`에서 `nextLearningAction(save: SaveData, pack: AppPack, now: Date): LearningAction`을 제공한다. `DecorationId`는 `leaf-flag | word-sign | acorn-basket`이다. 도감은 발견·복습 완료 목록을 분리하고 정규화한 낱말로 중복 제거한다.

- [ ] `first_goal_unlocks_leaf_flag_once`, `ten_discoveries_unlock_word_sign`, `five_mastered_words_unlock_acorn_basket`, `cannot_equip_locked_item`, `old_user_receives_eligible_unlocks`, `always_correct_user_has_discoveries`, `reduced_motion_keeps_reward_information`을 추가한다.
- [ ] `next_action_prefers_resume_then_due_three_then_quick`, `goal_complete_prefers_closing_message`, `no_due_shows_tomorrow_without_required_review`도 추가한다. `npm.cmd test -- --runInBand decorations collection daily-loop`로 실패 확인 후 구현하고 PASS를 확인한다.
- [ ] 문제 피드백에서는 예상 낱알과 작은 수집 연출, 완료 후에는 확정 낱알·해금·곳간 반영을 보여 준다. 홈 복귀 때 저장된 성장 결과를 반영하되 같은 결과 연출을 매번 반복하지 않는다.
- [ ] 초기 장식은 기존 미술 방향에 맞춘 코드 기반 단순 장식으로 시작하고 선택·장착을 도감 안에서 제공한다. 새 영상 제작이 필요하면 검증 후 별도 자산 작업으로 분리한다. `내일 복습 N개`는 예정일까지의 기록에서 계산하고 날짜 전환 때 갱신한다. 시각 검토 후 커밋한다.

### Task 12. 반복 알림과 빈도 제한

**Files:** 수정 `src/core/reminder.ts`, `src/data/reminder.ts`, `src/state/GameProvider.tsx`, `src/app/settings.tsx`, `src/app/_layout.tsx`, reminder·stage3 테스트.

**Interfaces:** `reminderPlans(settings: ReminderSettings): ReminderPlan[]`; `replaceOwnedReminders(plans: ReminderPlan[]): Promise<void>`. 빈도는 `off | daily | three-per-week`, 주 3회는 월·수·금, 시각은 기존 8·12·19·21시다. 저장 설정에 `reminderFrequency`를 추가하고 기존 켜진 설정은 `daily`, 꺼짐은 `off`로 이행한다. 이후 예약은 이 필드와 `reminderHour`로 계산하며 기존 `reminder`는 호환용으로만 같은 값에서 파생한다.

- [ ] `daily_is_one_repeating_daily_trigger`, `three_per_week_has_only_mon_wed_fri`, `refresh_does_not_duplicate_owned_ids`, `disable_or_permission_denial_removes_owned_requests`, `unrelated_notifications_are_preserved`, `notification_opens_due_review_or_home`를 추가한다.
- [ ] `npm.cmd test -- --runInBand reminder stage3`로 실패 확인 후 현재 설치된 expo-notifications의 `DAILY`·`WEEKLY` 반복 트리거를 사용해 구현하고 PASS를 확인한다. `cancelAllScheduledNotificationsAsync` 대신 이 기능이 소유한 id만 정리한다. 예약 교체 호출도 직렬화한다.
- [ ] 반복 알림에는 `복습할 낱말과 오늘의 목표를 확인해 보세요`처럼 시간이 지나도 틀리지 않는 문구를 쓴다. 현재 복습 수에 따른 구체적인 안내는 알림을 눌러 앱을 연 뒤 계산한다. 닫힌 앱에서 매일 최신 수를 재계산하는 서버 기능은 포함하지 않는다.
- [ ] 복습일별 맞춤 날짜 알림은 반복 알림과 동시에 켜지 않고 별도 후속 실험으로 둔다. 빈도는 하루 최대 한 번이며 기본 꺼짐을 유지한다. Android에서 권한 거절·앱 미실행 여러 날·시간대 변경·재부팅·알림 끄기를 확인한다. 기기 절전 정책에 따른 전달 차이를 기록하고 커밋한다.

### Task 13. 개인화 출제의 작은 실험

**Files:** 신규 `src/core/adaptive-picker.ts`, `src/core/__tests__/adaptive-picker.test.ts`; 수정 `src/core/progress.ts`, `src/core/picker.ts`, `src/state/GameProvider.tsx`, `src/app/record.tsx`; 신규 `docs/adaptive-picker-experiment.md`.

**Interfaces:** `pickAdaptiveRound(bank: AppQuestion[], progress: Progress, opts: { now: number; rng: () => number; count: number; choiceMode: boolean }): AppQuestion[]`. 보기 변환 가능 여부를 먼저 판정하고 실제 제시할 `kind`의 성적을 사용한다. 기존 통합 성적과 별개로 `Progress.recentAttempts`에 유형×풀이 방식별 최근 독립 시도 20개를 보관한다. 각 시도는 `correct: boolean`, `elapsedMs: number`, `answeredAt: number`를 가진다. 과거 기록의 반응시간과 입력 방식을 추정해 채우지 않는다. 퀵플레이는 보기형 후보 제한·예정 복습 최대 1개를 적용한 뒤 같은 분류 규칙을 사용한다.

- [ ] `insufficient_history_uses_easy_first`, `assisted_or_background_time_is_excluded`, `choice_history_does_not_raise_typed_difficulty`, `normal_10_targets_3_easy_5_matched_2_challenge`, `quick_5_targets_2_2_1`, `sparse_pool_fills_without_duplicate_answers`, `daily_challenge_unchanged`를 추가한다.
- [ ] `npm.cmd test -- --runInBand adaptive-picker picker challenge`로 실패 확인 후 순수 함수로 구현하고 PASS를 확인한다. 예정 복습을 먼저 넣고 잔여 칸에 비율을 적용한다. 10개/5개 비율 테스트는 복습이 없는 충분한 후보에서 수행한다.
- [ ] 독립 시도 20개 미만이면 현행 쉬운 문제 우선으로 시작한다. 최근 20개 정답률이 60% 미만이면 도전 칸을 쉬움으로 대체하고, 85% 이상일 때만 도전 칸을 사용한다. 중간 구간은 쉬움과 적정으로 채운다. 30/50/20은 상한 실험안이며 모든 사용자에게 강제하지 않는다.
- [ ] 분류는 `level: hard`를 도전, 그 외 `easy: true`를 쉬움, 나머지를 적정 후보로 시작한다. 각 묶음 안에서는 미출제를 우선하고 이미 본 문항은 오래된 순으로 뽑는다. 후보가 모자라면 도전→적정→쉬움 순서로 조건을 완화하되 같은 정답을 중복 출제하지 않는다. 최근 오답은 예정 복습 배정에서 우선 처리하고 당일 도움 재시도를 도전 성공으로 취급하지 않는다. 태그가 없는 문제를 검증된 어려움으로 취급하지 않는다.
- [ ] 반응시간은 같은 풀이 방식의 전경 시간 표본 10개 이상일 때만 복습 추천 동률 해소에 사용한다. 각 최근 시도에는 문항 `key`도 보관하고, 독립 정답이지만 답하는 데 오래 걸렸던 문항을 먼저 추천한다. 빠르게 눌렀다는 이유로 더 어려운 문제를 강제하거나 느린 답의 보상을 줄이지 않는다.
- [ ] 일반·퀵플레이만 대상으로 개발용 기능 설정으로 켜고 200개 고정 시드의 구성·중복·고갈을 재현한다. 정답률·첫 세 문제 이탈·완주율을 기존 출제와 구분해 관찰한 뒤 기본 활성화 여부를 결정하고 커밋한다. 관찰 규모와 비교 기간을 실험 문서에 남긴다.

### Task 14. 탐험 지도·주간 도전·친구 비교의 후속 설계

이 작업은 R1~R3에 포함한 구현과 별개의 기획 산출물이다. 신규 개발자는 아래 순서로 하위 설계를 작성하고 각 범위를 확정한 뒤 별도 구현 계획으로 진행한다.

**Files:** 신규 설계 `docs/superpowers/specs/player-adventure-map.md`, `docs/superpowers/specs/weekly-challenge-sharing.md`. 후보 코드 경로는 `src/core/adventure.ts`, `src/core/weekly-challenge.ts`, `src/app/adventure.tsx`이며 아직 생성하지 않는다.

- [ ] **탐험 지도 우선:** 기존 유형·테마로 3스테이지짜리 로컬 세로 흐름을 설계한다. 각 스테이지는 5문제, 완료와 독립 정답 3개를 별도 표시하고 잠금 해제는 완주로 결정해 오답 때문에 영구 정체되지 않게 한다. 공통 세션·보상·발견을 재사용하며 새 문제 은행·시간 압박·별도 재화를 만들지 않는다. 후보 고갈·세션 복구·반복 보상·기존 성장과의 중복을 인수 조건에 넣는다.
- [ ] **주간 도전 다음:** 일주일 식별자·문항 목록/묶음 버전·규칙 버전·보기 순서가 같을 때만 결과를 비교하도록 설계한다. 개인화·입력 설정은 제외한다. 일일 도전도 현재는 묶음이 다르면 같은 날짜에 같은 문제가 보장되지 않으므로 공유에 묶음/규칙 식별을 포함한다. 처음에는 오프라인 개인 도전·결과 공유까지로 제한한다.
- [ ] **친구 비교 범위 구분:** 공유 카드/텍스트는 정답 수·문항 수·날짜·도전 식별자를 포함하고 원문 답안은 빼며, 식별자가 다르면 직접 순위 비교를 하지 않는다. 이 단계는 친구 목록이나 검증된 순위표를 제공하는 것으로 설명하지 않는다.
- [ ] **서버 도입 조건:** 실제 친구 목록·초대·자동 점수 비교가 필요하면 계정 유무, 저장할 점수와 보존 기간, 공통 출제 manifest, 오프라인 제출, 중복 제출·조작 대응, 운영 비용을 별도 설계에서 결정한다. 현행 `계정·서버 쓰기 없음` 제약을 변경하는 범위이므로 이번 앱 개선의 필수 의존성으로 두지 않는다.
- [ ] **그 뒤의 후보:** 60초 스피드 도전은 기본 학습 루프가 검증된 뒤 별도 모드로 검토한다. 속도·콤보 점수는 해당 모드에 한정한다. 잠긴 공간·새 배경·다람쥐 행동 확장은 장식 사용과 지도 진행이 실제 재방문 이유가 되는지 관찰한 뒤 제작량을 정한다.

## 5. 성과 측정과 판단 기준

진단 동의 여부와 관계없이 학습·복구·미션은 정상 동작해야 한다. 공통 활동 기록은 게임 운영을 위한 기기 내 상태이며, Task 1의 선택적 진단 이벤트와 구분한다. 진단을 끈다고 복습 기록이나 장식을 삭제하지 않는다.

이벤트는 `session_started`, `answer_submitted`, `feedback_opened/expanded/continued`, `session_paused/resumed/finished/abandoned`, `save_failed`, `activity_credited`, `mission_completed`, `reward_unlocked`, `next_action_selected`를 사용한다. 판 종료 사유는 `all-answered | hearts-empty | user-ended`로 분리하고 화면이 사라졌다는 이유만으로 포기 이벤트를 만들지 않는다. `answer_submitted`에는 최초 시도와 도움 재시도를 구분한다.

| 지표 | 계산과 관찰 범위 | 해석 시 제외·분리 |
| --- | --- | --- |
| 첫 판 완주율 | 첫 퀴즈를 시작한 사람 중 배정 문제 전부 제출한 사람 / 시작한 사람 | 하트 소진은 별도 종료. 일반·퀵·도전, 앱/규칙 버전별 분리 |
| 첫 3문제 정답률·포기율 | 첫 세 개의 독립 시도 정답 수와 세 번째 전 명시적 종료 수 | 중단·복구를 즉시 포기로 분류하지 않음. 관찰 종료 때 미복귀는 별도 표시 |
| 종료 후 재시작률 | 결과 도달 후 같은 방문에서 다음 세션 시작 / 결과 도달 세션 | 목표 달성 뒤 종료는 정상적인 마무리로도 해석 |
| D1·D7 학습 재방문 | 첫 유효 학습일 다음 현지 달력 1일/7일째 유효 학습 여부 | 앱 열기만 제외. 카드·퍼즐 포함. 관찰일을 지난 코호트만 집계 |
| 복습 완료율 | 복습 시작 당시 선택한 문항 중 최초 판정·피드백까지 마친 수 / 선택한 수 | 정답률과 별개. 도움받은 해결·예정일 전 복습 분리 |
| 첫 7일 학습일 | 첫 학습일 포함 7개 현지 날짜 중 유효 학습한 날 수 | 판 수와 낱알 수를 대체값으로 쓰지 않음 |
| 지연 재시험 정답률 | 최초 오답·해설 뒤 다음 예정일 독립 정답 수 / 실제 지연 재시험 수 | 같은 날 재시도·보기/입력 전환·도움 사용 분리. 미응시율도 함께 표시 |
| 신뢰성과 조작 | 복구 성공/시도, 중복 지급 건수, 저장 실패 후 복구, 되돌리기 사용 | 발생 건수와 재현 조건 기록. 연습 환경을 실제 운영 비율로 해석하지 않음 |

앱에 서버 수집 경로가 없으므로 처음에는 동의한 테스트 참여자의 기기 기록과 관찰 일지를 비교한다. D1·D7은 참여자별 관찰 가능 여부를 함께 기록하고, 돌아온 사람의 내보내기만 모아 전체 유지율로 제시하지 않는다. 30일·2,000개 제한으로 진단 기록이 잘렸다면 해당 기간의 완주율·지연 재시험을 완전한 표본으로 계산하지 않는다. 실서비스 전체 비율이 필요해질 때 수집 기반을 별도 설계한다.

첫 배포 전 관찰로 기준선을 확보한다. 효과 목표의 퍼센트는 기준선과 표본 수를 본 뒤 정한다. 임의의 D7 증가 수치를 출시 약속으로 넣지 않는다. 반면 다음 항목은 통계와 무관한 통과 조건이다: 재현 시나리오에서 중복 지급 0건, 저장 확인된 상태의 복구 손실 0건, 저장 실패를 성공으로 표시하는 경우 0건, 어떤 지원 활동 조합에서도 목표 달성 불가 상태 없음.

## 6. 검증·출시·되돌리기

- [ ] 각 Task의 지정 테스트가 PASS한 뒤 릴리스 경계에서 `npm.cmd test -- --runInBand`, `npx.cmd tsc --noEmit`을 실행한다. 기존 239개 통과 기록은 분석 당시 기준이며 앞으로 추가할 기능의 검증을 대신하지 않는다.
- [ ] R1 기기 검증: 문제 입력 중/정답 해설 중/오답 해설 중/마지막 피드백 중/완료 저장 직후 각각 앱 전환·뒤로 가기·강제 종료·재실행. 답·보기·잔여 시간·별·성적·낱알을 비교한다.
- [ ] R1 경계 검증: 23:59 시작→자정 종료, 어제 도전 복구, 시각 앞뒤 변경, 묶음 교체, 저장 지연·실패·파싱 오류, 타이머 종료와 이중 탭을 함께 확인한다.
- [ ] R1 저장 부하 검증: 전체 문제에 가까운 누적 성적과 최근 완료 영수증 30개를 가진 저장으로 빠른 타이핑·연속 별 담기·제출을 수행한다. 초안 저장 대기열이 계속 늘지 않고, 제출 저장 대기 중에도 피드백이 멈추지 않으며, 느린 기기의 키 입력·저장 지연을 측정해 기록한다.
- [ ] R2 검증: 카드+퍼즐만으로 5개 달성, 오늘 복습 없음, 카드 없음, 같은 문제 다른 모드 재풀이, 미완료 판 종료, 업데이트 전 판 이어 하기, 장식 재지급·잠긴 장식 장착을 확인한다.
- [ ] 접근성 검증: Android 한 손 조작, 한글 키보드, 폭 360, 큰 글꼴, TalkBack, 동작 줄이기, 오프라인 상태에서 시작·복구·목표·도감을 확인한다.
- [ ] R3 알림 검증은 별도 테스트 기기에서 수행한다. 반복 트리거가 등록됐다는 사실과 실제 전달을 구분해 기록한다. 개인화는 고정 시드 검사와 사용자 관찰을 모두 거친다.
- [ ] 릴리스마다 코드·묶음·규칙 버전과 관찰 결과를 `docs/player-experience-validation.md`에 남긴다. 일정은 R1 저장/복구 검증과 Task 8의 20문항 검수 시간을 확인한 뒤 산정한다. 병목은 신규 모드 제작보다 저장 전환과 콘텐츠 검수다.
- [ ] 새 출제·보상·성장 표시에는 로컬 기능 설정을 두어 다음 앱 빌드에서 끌 수 있게 한다. 원격 기능 제어 서버가 있다고 가정하지 않는다. 되돌릴 때는 새 세션의 정책만 바꾸고 진행 중 세션·기존 영수증·낱알을 재계산하지 않는다. 이전 바이너리로의 단순 다운그레이드 대신 새 데이터를 읽는 수정 빌드로 복구한다.

첫 구현 묶음은 **R1의 저장 직렬화·중단 복구·수동 피드백·띄어쓰기 조작·복습/결과 동선**이다. 이를 배포 가능한 상태로 검증한 다음 **R2의 5문제 시작·통합 하루 목표·눈에 보이는 성장**을 적용한다. 탐험 지도와 소셜 확장은 이 공통 루프를 재사용하는 후속 프로젝트로 진행한다.
