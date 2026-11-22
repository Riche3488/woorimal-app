# 띄어쓰기 해설 검수와 반영

기준 묶음 `43a93208b1aa`의 띄어쓰기 578문제 중 해설 누락은 568개다. 원본은 웹 저장소에서 수정하고 앱의 생성 묶음은 직접 고치지 않는다.

`spacing-review-pilot.json`에는 첫 검수에 사용할 원본 문항 20개를 담았다. 해설은 아직 작성·검수하지 않았으며 앱에 반영하지 않았다. 단순 정답 재진술이나 조사 설명만 붙여 문제의 핵심을 설명한 것으로 처리하지 않는다.

검수자는 문항마다 핵심 오답 지점, 적용 규칙, 새 예문, 복수 허용 정답과의 일치를 확인한다. 단어 여부는 표준국어대사전과 국립국어원의 설명을 확인한다. 검수가 끝난 해설만 웹 `data/app-adapted/spacing.json` 등 해당 원본에 반영하고 웹에서 묶음을 다시 만든다. 20개 검수의 소요 시간을 측정한 뒤 100개·전체 누락분으로 확장한다.

```powershell
node --test scripts/check-spacing-explanations.check.mjs
node scripts/check-spacing-explanations.mjs
node scripts/check-spacing-explanations.mjs --strict
```

일반 검사는 기존 누락 목록을 기준으로 새 누락과 허용 답의 글자 불일치를 막는다. `--strict`는 해설 누락이 한 개라도 있으면 실패한다. 현재 묶음의 strict 실패는 아직 보완하지 않은 568개를 뜻하며 검수 완료를 뜻하지 않는다. 실제 문법 설명의 정확성과 학습 효용은 자동 검사만으로 보증하지 않는다.

웹 빌드 후 앱의 `npm.cmd run sync-pack`으로 내장 묶음을 갱신하고 pack·grading·testmode 테스트를 실행한다. 이 작업에는 원본 저장소 변경과 국어 검수가 별도로 필요하다.
