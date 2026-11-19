# 우리말 곳간 앱 (Android)

웹사이트 [우리말 곳간](https://woorimal-contest.co.kr)의 문제로 만든 숏폼 퀴즈 앱. 한 판 10문제, 문제마다 제한 시간, 하트 3개, 맞힐수록 낱알이 쌓여 다람쥐와 곳간이 자란다. 계정 없이 기기에 기록하고, 인터넷 없이도 풀 수 있다.

- 설계: [docs/superpowers/specs/2026-11-19-woorimal-app-design.md](docs/superpowers/specs/2026-11-19-woorimal-app-design.md)
- 1차 구현 계획: [docs/superpowers/plans/2026-11-19-woorimal-app.md](docs/superpowers/plans/2026-11-19-woorimal-app.md)

## 구조

| 경로 | 용도 |
| --- | --- |
| `src/core/` | 화면과 분리한 게임 규칙(채점·제한 시간·하트·출제·성장·묶음 검사). Jest로 검증 |
| `src/data/` | 기기 저장(AsyncStorage), 문제 묶음 읽기·갱신(expo-file-system) |
| `src/state/GameProvider.tsx` | 묶음·저장을 화면에 넘기는 상태 |
| `src/app/` | 화면(expo-router): 홈·게임·결과·기록·설정 |
| `src/components/` | 게임 화면과 작은 조각들 |
| `assets/pack.json` | 앱에 내장하는 문제 묶음 (`npm run sync-pack`으로 갱신) |

## 문제 묶음

콘텐츠 원본은 웹 저장소 `D:\projects\woorimal_contest`의 `data/*.json`이다. 이 저장소에서 문제를 고치지 않는다.

1. 웹 저장소에서 `npm.cmd run build` → `public/app/pack.json` 생성
2. 웹을 배포하면 앱은 실행할 때 `https://woorimal-contest.co.kr/app/version.json`을 보고 새 묶음을 내려받는다(앱 업데이트 불필요)
3. 앱에 내장할 묶음을 바꾸려면 이 저장소에서 `npm.cmd run sync-pack`

문제마다 출처 라벨(`kbs` / `original` / `blog`)이 있고, `kbs` 문제에는 "출처: KBS 우리말 겨루기"를 작게 표시한다. KBS 문제를 앱에서 빼려면 웹 저장소 `config/app-pack.json`의 `excludeSources`에 `"kbs"`를 넣고 빌드·배포한다.

## 실행과 검사

```powershell
npm.cmd install
npm.cmd test            # Jest
npx tsc --noEmit        # 타입 검사
npx expo start --android
```

## Android 빌드

```powershell
npx eas-cli login
npx eas-cli build -p android --profile preview      # 설치용 APK
npx eas-cli build -p android --profile production   # Play 스토어용 AAB
```

패키지 이름 `kr.co.woorimalcontest.app`. 아이콘·스플래시 그림은 아직 Expo 기본 자리 표시자다.

## 테스트 모드 (답을 몰라도 기능 확인)

설정 화면 맨 아래 "문제 N개 · 묶음 …" 줄을 7번 누르면 "테스트 모드" 스위치가 나타난다. 켜면 게임 화면에 정답과 **정답 제출 / 오답 제출 / 시간 초과로 넘기기** 버튼이 생기고, 설정에 **기록 초기화**(낱알·레벨·문제 기록 삭제, 설정 유지)가 생긴다. 일반 사용자는 스위치를 볼 수 없고 기본값은 꺼짐이다. 정답·오답 입력은 `src/core/testmode.ts`이며, 묶음의 모든 문제가 정답 입력으로 맞고 오답 입력으로 틀리는지 테스트가 검사한다.
