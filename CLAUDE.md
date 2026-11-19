# 우리말 곳간 앱 — Claude 작업 안내

웹 문제로 만든 Android 숏폼 퀴즈 앱(Expo SDK 58, TypeScript, expo-router). 구조와 명령은 `README.md`, 설계는 `docs/superpowers/specs/`.

## 꼭 지킬 규칙

- 콘텐츠 원본은 웹 저장소 `D:\projects\woorimal_contest`의 `data/*.json`. 이 저장소에서 문제를 고치지 않는다. 묶음 형식은 웹 저장소 `scripts/lib/app-pack.mjs`가 정하고, `src/core/types.ts`는 그 형식을 따른다. 형식을 바꾸면 두 저장소를 함께 고친다.
- 채점(`src/core/grading.ts`)은 웹 `public/scripts/lib/grading.mjs`·`mock.mjs`를 옮긴 것이다. 웹 규칙이 바뀌면 맞춘다.
- 게임 규칙은 `src/core/`의 순수 함수에 두고 테스트를 먼저 쓴다(`npm.cmd test`). 화면 테스트는 `@testing-library/react-native` 14(비동기 API: `await render`, `await fireEvent`).
- 광고·계정·서버 쓰기 없음(1차). 비밀 값을 넣지 않는다.
- 커밋 뒤 push하고 `git rev-parse HEAD origin/main`으로 확인한다.
- Windows PowerShell에서는 `npm.cmd`.
- `assets/pack.json`(약 2MB)은 통째로 읽지 않는다. `node -e`로 필요한 부분만 본다.
