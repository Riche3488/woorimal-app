# 우리말 곳간 앱 (Android)

웹사이트 [우리말 곳간](https://woorimal-contest.co.kr)의 문제로 만든 숏폼 퀴즈 앱. 한 판 10문제, 문제마다 제한 시간, 하트 3개, 맞힐수록 낱알이 쌓여 다람쥐와 곳간이 자란다. 계정 없이 기기에 기록하고, 인터넷 없이도 풀 수 있다.

- 설계: [docs/superpowers/specs/2026-11-19-woorimal-app-design.md](docs/superpowers/specs/2026-11-19-woorimal-app-design.md)
- 1차 구현 계획: [docs/superpowers/plans/2026-11-19-woorimal-app.md](docs/superpowers/plans/2026-11-19-woorimal-app.md)
- 오늘의 문제(날짜 시드로 모두에게 같은 5문제, 하루 한 번, 🟩🟥⏰ 결과 공유): [docs/superpowers/specs/2026-11-19-daily-challenge.md](docs/superpowers/specs/2026-11-19-daily-challenge.md)
- 공부 기능('모르겠어요'=오답 처리, 오답노트(복습할 문제·⭐ 담은 문제·외운 문제), 간격 복습 1→3→7일·세 번 맞히면 외움, 기록 화면에서 유형별 연습): [docs/superpowers/specs/2026-11-19-study-notebook.md](docs/superpowers/specs/2026-11-19-study-notebook.md)
- 계속하게 만드는 장치(하루 목표 3판·도토리 연속 기록 보호권·결과 화면 다음 목표 안내·틀리면 해설 읽고 넘기기): [docs/superpowers/specs/2026-11-19-retention-1.md](docs/superpowers/specs/2026-11-19-retention-1.md)
- 디자인(한지 디오라마): 가이드 [docs/design/art-direction.md](docs/design/art-direction.md), 자산 목록·크레딧 [docs/design/assets.md](docs/design/assets.md), 전후 비교 [docs/design/README.md](docs/design/README.md)

## 구조

| 경로 | 용도 |
| --- | --- |
| `src/core/` | 화면과 분리한 게임 규칙(채점·제한 시간·하트·출제·성장·묶음 검사). Jest로 검증 |
| `src/data/` | 기기 저장(AsyncStorage), 문제 묶음 읽기·갱신(expo-file-system) |
| `src/state/GameProvider.tsx` | 묶음·저장을 화면에 넘기는 상태 |
| `src/app/` | 화면(expo-router): 홈·게임·결과·기록·오답노트·설정 |
| `src/components/` | 게임 화면과 작은 조각들 |
| `assets/pack.json` | 앱에 내장하는 문제 묶음 (`npm run sync-pack`으로 갱신) |

## 문제 묶음

콘텐츠 원본은 웹 저장소 `D:\projects\woorimal_contest`의 `data/*.json`이다. 이 저장소에서 문제를 고치지 않는다.

1. 웹 저장소에서 `npm.cmd run build` → `public/app/pack.json` 생성
2. 웹을 배포하면 앱은 실행할 때 `https://woorimal-contest.co.kr/app/version.json`을 보고 새 묶음을 내려받는다(앱 업데이트 불필요)
3. 앱에 내장할 묶음을 바꾸려면 이 저장소에서 `npm.cmd run sync-pack`

문제마다 출처 라벨(`kbs` / `original` / `blog` / `adapted`)이 있다.

- **저작권 대응(KBS 문제 재가공)**: 웹 저장소 `config/app-pack.json`의 `adaptKbs: true`(현재 켜짐)면 앱 묶음에는 방송 문장이 들어가지 않는다. 방송 문제에서는 정답 낱말만 가져오고, 문제 문장은 표준국어대사전 뜻풀이(`data/app-adapted/dict.json`)나 새로 쓴 띄어쓰기 문장(`data/app-adapted/spacing.json`)으로 다시 만든다(`adapted`). 다시 만들 수 없는 형식(번호 고르기, 대화문, 음절 조합, 보기 고르기 등)은 뺀다. 웹 공개 빌드는 그대로다. 규칙은 웹 `scripts/lib/app-adapt.mjs`에 있다.
- `adapted` 문제에는 KBS 출처를 표시하지 않는다. 설정 화면에는 "뜻풀이: 국립국어원 표준국어대사전(CC BY-SA 2.0 KR)"을 늘 표시하고, 묶음에 `kbs` 문제가 있을 때만 KBS 출처를 함께 보인다.
- 원격 묶음 안전장치(`src/core/pack.ts`): 형식·유형·출처·키 중복 검사, `minApp`(새 앱이 필요한 묶음) 거절, 지금 묶음보다 오래된 묶음 거절, 문제 수가 절반 아래로 줄면 거절(웹 `config/app-pack.json`의 `shrink: true`로 일부러 줄인 경우는 허용). 앱 업데이트로 내장 묶음이 더 새것이면 내려받아 둔 묶음 대신 내장 묶음을 쓴다.

## 실행과 검사

```powershell
npm.cmd install
npm.cmd test            # Jest
npx.cmd tsc --noEmit    # 타입 검사
npm.cmd run start:android                  # = APP_VARIANT=development expo start --android. 기기가 LAN으로 개발 서버에 닿을 때
npm.cmd run start:android -- --localhost   # USB 연결 기기(adb reverse)로 붙을 때
```

`npm.cmd run android`는 Metro만 띄우는 명령이 아니라 `expo run:android`, 곧 네이티브 개발 빌드(수 분, JDK·Android SDK 필요)다. JS만 다시 열 때는 `npm.cmd run start:android`를 쓴다.

`expo start`는 네이티브 빌드를 하지 않는다. Metro를 띄워 기기에 설치된 **개발 빌드**(expo-dev-client)로 JS를 열고, `src/` 수정은 저장하면 바로 반영된다(Fast Refresh). 테스트는 따로 `npm.cmd test`로 돌린다.

개발 빌드는 처음 한 번, 그리고 네이티브 모듈을 더하거나 `app.json` 플러그인·권한을 바꿨을 때만 다시 만든다.

```powershell
npm.cmd run android                                                      # = APP_VARIANT=development expo run:android. 로컬 빌드(JDK·Android SDK 필요), 에뮬레이터에 설치
npx.cmd eas-cli build -p android --profile development                   # 또는 EAS에서 개발 빌드 APK
```

EAS `development` 프로필과 npm 스크립트 `start`·`android`·`start:android`(`scripts/expo-dev.mjs`)는 `APP_VARIANT=development`로 돌아서 패키지 이름이 `kr.co.woorimalcontest.app.dev`, 앱 이름이 "우리말 곳간 (개발)", 스킴이 `woorimal-dev`가 된다(`app.config.js`). 그래서 Play 테스트·스토어 앱과 한 기기에 함께 설치되고 저장 기록도 따로 간다. `npx.cmd expo ...`를 직접 부르면 변수가 빠져 스토어 패키지 이름으로 빌드되니(서명이 달라 설치 실패, 지우면 그 기기의 기록이 사라짐) npm 스크립트를 쓴다. 예전에 변수 없이 만든 `android/`가 남아 있으면 `npx.cmd expo prebuild --clean`(변수 포함: `node scripts/expo-dev.mjs prebuild --clean`)으로 다시 만든다.

스토어·preview 빌드는 expo-dev-client가 넣는 `exp+woorimal-app` 스킴을 빼고 `woorimal`만 둔다(개발 실행기 네이티브 코드는 릴리스에서 원래 빠진다).

`expo run:android`에는 JDK가 필요하다. 따로 설치하지 않았다면 Android Studio에 든 JDK를 쓴다(`$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"`). 만들어진 `android/`는 커밋하지 않는다(`.gitignore`). `adb`가 응답하지 않는다는 오류가 나면 `adb kill-server` 뒤 `adb start-server`로 다시 띄운다. Expo Go로도 열 수는 있지만(`expo start`에서 `s`로 전환) Expo Go에는 `expo-notifications`가 쓰는 네이티브 모듈이 없어 학습 알림이 꺼진다(`src/data/reminder.ts`).

## Android 빌드

```powershell
npx.cmd eas-cli login
npx.cmd eas-cli build -p android --profile development  # 개발 빌드 APK(expo-dev-client)
npx.cmd eas-cli build -p android --profile preview      # 설치용 APK
npx.cmd eas-cli build -p android --profile production   # Play 스토어용 AAB
```

`versionCode`는 EAS 서버가 관리한다(`appVersionSource: remote`, production 빌드마다 자동 증가). 사용자에게 보이는 버전은 `app.json`의 `version`을 올린다. 출시 점검과 할 일: [docs/2026-11-20-play-store-release.md](docs/2026-11-20-play-store-release.md)

패키지 이름 `kr.co.woorimalcontest.app`. 아이콘·스플래시는 다람쥐 캐릭터(만든 방법: `docs/design/assets.md`).

## 테스트 모드 (답을 몰라도 기능 확인)

설정 화면 맨 아래 "문제 N개 · 묶음 …" 줄을 7번 누르면 "테스트 모드" 스위치가 나타난다. 켜면 게임 화면에 정답과 **정답 제출 / 오답 제출 / 시간 초과로 넘기기** 버튼이 생기고, 설정에 **기록 초기화**(낱알·레벨·문제 기록 삭제, 설정 유지)가 생긴다. 개발 실행(`__DEV__`)과 preview 빌드(`eas.json`의 `EXPO_PUBLIC_TEST_MODE=1`)에서만 열리고, Play용 production 빌드에서는 7번 눌러도 나타나지 않는다(`src/core/app-info.ts`). 기본값은 꺼짐이다. 정답·오답 입력은 `src/core/testmode.ts`이며, 묶음의 모든 문제가 정답 입력으로 맞고 오답 입력으로 틀리는지 테스트가 검사한다.
