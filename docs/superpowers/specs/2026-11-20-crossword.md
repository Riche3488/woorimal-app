# 가로세로 퍼즐

작성일: 2026-11-20 · 근거: [콘텐츠 확장·경험 개선 방안](../../2026-11-20-content-expansion-ideas.md) C5

## 범위

- 웹 `config/content-release.json`의 `crosswordIds`(공개 허용, 현재 8판: 쉬움 2·보통 4·어려움 2)만 싣는다. 나머지 18판은 검수 상태를 확인하고 허용 목록에 넣으면 다음 빌드부터 앱에도 들어간다.
- 힌트는 표준국어대사전 뜻풀이를 고친 것이다. 낱말별 사전 링크는 싣지 않고 설정 화면의 사전 출처 표기(CC BY-SA 2.0 KR)로 밝힌다.

## 묶음

웹 `scripts/lib/app-pack.mjs`의 `appCrosswords`: `{ id, level, theme, rows, cols, entries[{num,dir,row,col,answer,clue}], intro, notes[{title,text}] }`를 `crosswords` 선택 필드로. `build.mjs`가 `selected.boards`를 넘긴다. 앱 `pack.ts`는 판 밖으로 나가거나 엇갈린 칸 글자가 다른 판만 뺀다.

## 푸는 방식 (휴대폰용)

- 칸을 하나씩 채우지 않고 **낱말을 통째로 입력**한다(웹 판의 칸 입력은 작은 화면에서 불편). 판은 작게 보여 주고, 고른 낱말의 칸을 밝힌다.
- 칸을 누르면 그 칸의 낱말, 가로·세로가 겹치는 칸을 다시 누르면 방향을 바꾼다. 힌트 목록을 눌러도 고른다.
- 이미 채워진 칸(엇갈리는 낱말, 글자 보기)은 입력 모양 `운○○`으로 보여 준다.
- **글자 보기**: 고른 낱말의 빈칸 하나를 보여 주고 도움 수를 센다. 엇갈리는 낱말·글자 보기로 칸이 다 찬 낱말은 푼 것으로 친다(낱알 없음).
- 직접 맞힌 낱말마다 **낱알 5개**. 낱알을 받은 날은 연속 기록에 센다. 판 수·하루 목표는 세지 않는다.
- 다 풀면 판의 학습 안내(intro·notes)를 보여 준다.
- 진행은 `save.crosswords[id] = { solved, revealed, helps }`.

규칙은 `src/core/crossword.ts`(칸 규칙은 웹 `public/scripts/lib/crossword.mjs`와 같다), 화면은 `src/app/puzzles.tsx`(목록)·`src/app/puzzle.tsx`(한 판), 홈의 "가로세로 퍼즐" 버튼(오답노트 옆).

## 내가 정한 것 (고칠 수 있음)

- 낱말 통째 입력, 낱말당 낱알 5개, 글자 보기는 낱알 감점 없이 횟수만 표시.
- 낱알을 받은 날은 연속 기록에 센다(공부한 날로 본다).
