# Google Play 출시 점검과 할 일

작성일: 2026-11-20 · 상태: 1단계 끝, 2단계는 에뮬레이터 확인·AAB 빌드까지 끝(실기기 확인·keystore 백업 남음). 웹 개인정보처리방침 배포함(2026-11-20)

앱을 Google Play에 처음 올리기 전에 저장소 안에서 확인할 수 있는 것을 점검했고, 남은 일을 순서대로 적었다. Play 정책 수치(테스터 수, 대상 API 등)는 자주 바뀌므로 진행할 때 Play Console 안내로 다시 확인한다.

## 1. 점검 결과

### 통과

| 항목 | 확인한 내용 |
| --- | --- |
| 테스트·타입 | `npm.cmd test` 27개 묶음·230개 테스트 통과, `npx tsc --noEmit` 오류 없음 |
| Expo 상태 | `npx expo-doctor` 20/20 통과 (SDK 58, 의존성 버전 일치) |
| 대상 API | React Native 0.88 기본값 `targetSdk 36`·`compileSdk 37`·`minSdk 24`. Play의 새 앱 대상 API 요건을 충족한다 |
| 16KB 페이지 | RN 0.88·Expo 58 네이티브 라이브러리는 16KB 페이지 크기를 지원한다. AAB를 올리면 Play Console의 App bundle explorer에서 한 번 더 확인 |
| 빌드 설정 | `eas.json` production = `app-bundle`(AAB), EAS 프로젝트 ID·owner 설정됨 |
| 패키지 이름 | `kr.co.woorimalcontest.app`, `versionCode 1`, `version 1.0.0` |
| 아이콘 | `icon.png`·적응형 아이콘 전경 1024×1024, 배경·단색 아이콘 있음 |
| 권한 | 앱이 요청하는 위험 권한은 `POST_NOTIFICATIONS`뿐이고 켤 때 묻는다. 라이브러리가 넣는 권한: `INTERNET`, `VIBRATE`, `RECEIVE_BOOT_COMPLETED`(알림), 저장소 읽기·쓰기(`maxSdkVersion 32`, 옛 기기용). 정밀 알람(`SCHEDULE_EXACT_ALARM`)은 없어 별도 신고가 필요 없다 |
| 비밀 값 | 저장소에 키·keystore 없음(`.gitignore`가 `*.jks`·`*.p12`·`.env` 제외) |
| 개인정보 | 계정·광고·분석 SDK 없음. 기록은 기기(AsyncStorage)에만 둔다. 서버 통신은 문제 묶음 내려받기(`/app/version.json`·`pack.json`, 읽기 전용)뿐이다. 문제 신고는 웹 제보 화면을 브라우저로 열 뿐 앱이 보내지 않는다 |
| 원격 콘텐츠 | 묶음은 실행 코드가 아닌 JSON이고 형식 검사·`minApp` 거절이 있다. Play의 "앱 밖에서 코드 내려받기 금지" 정책에 걸리지 않는다 |
| 저작권 | 앱 묶음 6,120문제 중 `kbs` 0개(original 1,475 · adapted 4,323 · blog 322). 설정 화면에 표준국어대사전(CC BY-SA 2.0 KR) 출처 표시. 글꼴 고운바탕 SIL OFL 1.1 |

### 손볼 것

| # | 항목 | 문제 | 조치 |
| --- | --- | --- | --- |
| F1 | **앱 개인정보처리방침 없음** | Play Console은 개인정보처리방침 URL을 요구한다. 웹 `privacy.html`은 웹 사이트(Firebase 활동 수집·로그인)를 설명하므로 앱과 맞지 않는다 | 웹 저장소에 앱 전용 방침(예: `public/app/privacy.html`)을 만든다. "수집 없음·기기 저장·묶음 내려받기·알림은 기기 예약·문의처"만 적는다. 앱 설정 화면에도 링크를 둔다 |
| F2 | 쓰지 않는 의존성 | `expo-glass-effect`, `expo-symbols`, `@expo/ui`, `expo-web-browser`, `expo-device`, `expo-constants`(직접 import 없음), `expo-system-ui`, `react-native-web` | 하나씩 빼고 `expo-doctor`·테스트·실기기 빌드로 확인한다. 네이티브 모듈이 줄어 용량과 검토 범위가 줄어든다. `expo-constants`·`expo-system-ui`는 다른 패키지가 쓰므로 남겨도 된다 |
| F3 | 앱 버전이 화면에 없음 | 설정에는 묶음 버전만 나온다. 사용자 문의·신고 때 앱 버전을 알 수 없다 | 설정 정보 줄에 `앱 1.0.0 (1)`을 함께 보인다. 신고 URL에도 넣는다 |
| F4 | 오류 화면 없음 | 화면에서 예외가 나면 앱이 꺼진다. expo-router `ErrorBoundary`를 쓰는 화면이 없다 | `_layout.tsx`에 `ErrorBoundary`를 내보내 "다시 시도"와 홈 이동을 보인다 |
| F5 | 버전 번호 수동 관리 | `appVersionSource: local`이라 올릴 때마다 `versionCode`를 직접 올려야 한다. 같은 번호는 Play가 거절한다 | `appVersionSource: remote` + production `autoIncrement: true`로 바꾸거나, 출시 절차에 "versionCode 올리기"를 넣는다 |
| F6 | 테스트 모드가 출시 빌드에 있음 | 설정에서 7번 누르면 정답이 보이는 모드가 열린다. 정책 위반은 아니지만 기록을 쉽게 부풀릴 수 있다 | 그대로 둘지 정한다. 막으려면 `__DEV__` 또는 preview 프로필(`EXPO_PUBLIC_*` 환경 값)에서만 열리게 한다 |
| F7 | AI 생성 그림 상업 이용 | `docs/design/assets.md`에 "출시 전에 Higgsfield 이용약관을 다시 확인"이라고 남아 있다 | 약관을 확인해 날짜와 함께 `assets.md`에 적는다 |
| F8 | `blog` 출처 띄어쓰기 322문제 | id가 `original-spacing-*`인 자체 작성 문장으로 보이지만 문서로 확인하지 못했다 | 직접 쓴 블로그 글이 원본인지 확인해 웹 README에 적는다. 남의 글이면 빼거나 다시 쓴다 |
| F9 | 패키지 이름 확정 | 한 번 올리면 바꿀 수 없다. 도메인은 `woorimal-contest.co.kr`, 앱 이름은 "우리말 곳간" | `kr.co.woorimalcontest.app`으로 갈지 첫 업로드 전에 정한다 |

## 2. 할 일

### 1단계: 코드·저장소 (이 저장소와 웹 저장소)

- [x] F1 앱 전용 개인정보처리방침: 웹 `public/app/privacy.html`(웹 커밋 3975b7c), 앱 설정에 "개인정보처리방침" 줄(`src/core/app-info.ts`의 `PRIVACY_URL`)
  - [x] 웹 배포(`firebase.cmd deploy --only hosting`, 웹 저장소에서) 뒤 https://woorimal-contest.co.kr/app/privacy.html 200 확인
- [x] F3 설정 정보 줄에 `앱 1.0.0`, 신고 대상 글에 `앱 1.0.0` 추가(`src/data/build.ts`의 `APP_VERSION`, expo-constants)
- [x] F4 루트 `ErrorBoundary`(`src/components/ErrorScreen.tsx`: 다시 시도·처음으로)
- [x] F2 `expo-glass-effect`·`expo-symbols`·`@expo/ui`·`expo-web-browser`·`expo-device` 제거(expo-router의 선택 의존성이라 빼도 됨). `expo-constants`(expo-router 필수)·`expo-system-ui`·`react-native-web`은 남김. `expo-doctor` 20/20, `expo export --platform android` 성공
- [x] F5 `eas.json`: `appVersionSource: remote`, production `autoIncrement: true`. 첫 production 빌드 때 EAS가 시작 번호를 물으면 1로 둔다(또는 `npx eas-cli build:version:set`)
- [x] F6 테스트 모드는 개발 실행과 preview 빌드(`EXPO_PUBLIC_TEST_MODE=1`)에서만 열림. production에서는 저장된 값이 켜져 있어도 무시
- [x] F7 Higgsfield 약관(2026-10-23 갱신) 4.4항: 생성물 상업 이용 제한 없음, 요금제 예외 없음 → `docs/design/assets.md`에 기록. 남은 일: 9~10항(구독·크레딧) 원문 확인, 한국 법이 AI 생성물 표시를 요구하는지 확인(필요하면 설정 출처 줄에 "그림: AI 생성" 추가)
- [x] F8 `blog` 띄어쓰기 322문제는 운영자가 직접 쓴 문장(2026-11-20 확인). 그대로 둔다
- [x] F9 패키지 이름 `kr.co.woorimalcontest.app`으로 확정(2026-11-20)
- [ ] (선택) 웹 `terms.html`처럼 앱 이용약관이 필요한지 판단. 계정·결제가 없으므로 1차에는 없어도 된다

### 2단계: 빌드와 실기기 확인

2026-11-20 에뮬레이터(Android 16, API 36)에서 preview 빌드로 확인한 결과. 실기기 확인은 남았다.

- [x] preview APK 빌드·설치(versionCode 1, targetSdk 36)
  - [x] 홈·설정·오답노트·기록·퍼즐 목록·문제 풀이·결과 화면 표시, 비정상 종료 없음
  - [x] 설정의 개인정보처리방침 → 브라우저로 https://woorimal-contest.co.kr/app/privacy.html 열림
  - [x] 앱 데이터 지우고 인터넷 끈 첫 실행: 내장 묶음으로 바로 풀이
  - [x] 알림: 켤 때 권한 요청, 거절하면 안내 후 꺼진 채로, 허용하면 오후 7시 예약(부정확 알람이라 최대 1시간 늦을 수 있음). 재부팅 뒤에도 예약 유지
  - [x] preview 빌드에서 7번 누르면 테스트 모드 스위치가 나타남
  - [x] 글꼴 1.3배는 문제없음. **2배에서 찾은 문제를 고침**(커밋 e78f31a): '뒤로'가 두 줄로 꺾임(7개 화면), 홈 '다음 레벨까지' 화면 밖, '오늘' 도장·오늘의 낱말 잘림, 오답노트 탭 꺾임. 고친 빌드에서 홈·오답노트를 다시 확인함(나머지 화면의 '뒤로'는 같은 수정이라 실기기 확인 때 함께 봄)
  - [x] **권한 정리**: 라이브러리가 넣던 `SYSTEM_ALERT_WINDOW`(다른 앱 위에 그리기)·`c2dm.permission.RECEIVE`(FCM 서버 푸시)·`BIND_GET_INSTALL_REFERRER_SERVICE`(설치 리퍼러)를 `app.json`의 `blockedPermissions`로 막음. 남은 권한: 인터넷·네트워크 상태·알림·부팅 완료 수신·진동·WAKE_LOCK·앱 배지(expo-notifications의 런처별 배지 권한 포함, 일반 권한)
- [ ] **실기기 2대 이상**(Android 10 이하 1대, Android 14 이상 1대 권장)에서 preview APK 설치해 확인: 실제 알림이 오는지, 영상 재생, 뒤로 가기 버튼, 앱 전환 후 복귀, 화면 낮은 기기. 설치 링크는 `npx eas-cli build:list`의 최신 preview
- [x] production AAB 빌드(versionCode 3. 첫 시도가 업로드 전에 실패하면서 번호 2를 건너뜀, Play에는 문제없음)
- [ ] EAS가 만든 업로드 키는 EAS 서버에 있다. `npx eas-cli credentials` → Android → production → Keystore → Download로 내려받아 저장소 밖 안전한 곳에 백업(대화형 명령이라 직접 실행)

### 3단계: Play Console 계정·앱 만들기

- [ ] 개발자 계정 등록(등록비 25달러, 신원 확인). 개인 계정인지 조직 계정인지 정한다. 조직 계정은 D-U-N-S 번호가 필요하다
- [ ] 공개될 개발자 이름·연락 이메일 정하기(개인 이메일 대신 앱 전용 주소 권장)
- [ ] 앱 만들기: 기본 언어 한국어, 앱, 무료
- [ ] Play 앱 서명 사용(기본값). EAS 업로드 키로 서명한 AAB를 올린다

### 4단계: 앱 콘텐츠 신고 (Play Console > 정책 > 앱 콘텐츠)

- [ ] 개인정보처리방침 URL (1단계 F1)
- [ ] 광고: 없음
- [ ] 앱 액세스: 로그인 없이 모든 기능 사용 가능
- [ ] 데이터 보안: 수집·공유하는 데이터 없음. 전송은 HTTPS로 묶음 읽기뿐이라 "수집 안 함"으로 신고한다. 신고 내용과 F1 방침이 서로 맞아야 한다
- [ ] 콘텐츠 등급(IARC 설문): 폭력·도박·사용자 간 소통 없음 → 전체 이용가 예상
- [ ] 대상 연령층: **13세 이상**으로 고르는 것을 권장. 13세 미만을 넣으면 가족 정책(교사 승인 프로그램 등 추가 요건)이 적용된다. 학생 대상으로 넓히려면 그때 다시 검토
- [ ] 뉴스 앱 아님, 정부 앱 아님, 금융 기능 없음, 건강 기능 없음
- [ ] 알림 권한 사용 목적은 따로 신고할 항목이 없다(정밀 알람·전체 화면 알림을 쓰지 않음)

### 5단계: 스토어 등록정보

- [ ] 앱 이름(30자): "우리말 곳간" + 짧은 부제 검토(예: "우리말 곳간 - 맞춤법·띄어쓰기 퀴즈")
- [ ] 간단한 설명(80자), 자세한 설명(4,000자)
- [ ] **KBS·"우리말 겨루기" 이름을 앱 이름·설명·그림에 쓰지 않는다.** 방송과 관계있는 것처럼 보이면 사칭·상표 문제로 거절될 수 있다. "대회 준비"는 일반 표현으로 쓴다
- [ ] 앱 아이콘 512×512 PNG(32비트, 1MB 이하) — `assets/images/icon.png`(1024)를 줄여 만든다
- [ ] 그래픽 이미지 1024×500
- [ ] 휴대전화 스크린샷 2~8장(권장 4장 이상, 세로 9:16): 홈, 문제 풀이, 결과, 오답노트, 퍼즐
- [ ] 카테고리: 교육(또는 퀴즈 게임). 태그·연락처 이메일·웹사이트(`https://woorimal-contest.co.kr`)

### 6단계: 테스트 트랙과 출시

- [ ] 내부 테스트 트랙에 AAB 올려 사전 출시 보고서(자동 기기 테스트) 확인
- [ ] **2023-11 이후 만든 개인 계정은 비공개 테스트를 거쳐야 프로덕션을 열 수 있다**(현재 안내 기준 테스터 12명 이상이 14일 연속 참여). 테스터 모집 계획을 미리 세운다: 웹 사이트 방문자·지인·블로그 독자
- [ ] 비공개 테스트 기간에 받은 의견 반영, 버전 올려 다시 배포
- [ ] 프로덕션 액세스 신청(테스트 내용 설문) → 승인 뒤 프로덕션 출시(처음엔 단계적 출시 20% 권장)
- [ ] 출시 뒤: Android vitals(비정상 종료·ANR), 리뷰 답변, 묶음 갱신이 실제 기기에 내려오는지 확인

### 출시 뒤 검토 (1차 범위 밖)

- 비정상 종료 보고 도구(Sentry 등)를 넣으면 데이터 보안 신고와 개인정보처리방침을 함께 고친다
- 광고·계정을 넣으면 위 4단계를 다시 한다
- 웹 `README`의 "앱 묶음 배포" 절차에 "웹 배포 = 앱 콘텐츠 즉시 변경"임을 강조(검수 없이 모든 사용자에게 나감)
