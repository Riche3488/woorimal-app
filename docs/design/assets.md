# 시각 자산 목록 (Asset Manifest)

생성: 2026-11-20 · 도구: Higgsfield MCP · 쓴 크레딧: **55** (무료 플랜 8 + Starter 47)

원본(PNG·원본 MP4)은 `assets/art/src/`에 두고 git에 넣지 않는다(`.gitignore`). 앱에는 줄인 파일만 들어간다. 앱은 실행 중에 Higgsfield를 부르지 않는다.

## 만든 순서

1. **A1 기준 다람쥐**를 먼저 만들고 확인받는다. 이후 모든 생성에 A1을 참조 이미지로 넣어 스타일을 맞춘다.
2. 무료 플랜은 GPT Image(0.5크레딧)를 쓸 수 없고 Nano Banana Pro(장당 2크레딧, 1k·2k 같은 값)만 가능했다. 그래서 2k 한 장에 여러 자산을 담는 **시트**로 만들고 로컬에서 잘랐다.
3. 흰 배경은 로컬 `rembg`(isnet-general-use)로 지웠다. 크림색 벽면이 배경으로 오인돼 지워지는 문제가 있어, 바깥과 이어지지 않은 투명 구멍을 메우는 후처리를 더했다.
4. 홈 영상은 [배경 + 곳간 + 다람쥐]를 로컬에서 합성한 정지 그림을 **시작·끝 프레임으로 같이 넣은 Image-to-Video**로 만들었다. 처음과 끝이 같아 끊김 없이 돈다(첫·끝 프레임 PSNR 약 43dB).
5. 파일 줄이기: 그림은 ffmpeg libwebp, 영상은 libx264 CRF 27 720px, 소리 제거.

## 목록

| ID | 화면 | 용도 | 유형·크기 | 모델 | 크레딧 | 앱 파일 (크기) |
| --- | --- | --- | --- | --- | --- | --- |
| A1 squirrel-idle | 홈 합성·게임·기록 | 기준 캐릭터 | 1:1 1k → 투명 480px | Nano Banana Pro | 2 | `assets/art/squirrel-idle.webp` (19KB) |
| S1 곳간 시트 → barn-1·2·3 | 홈 합성·결과 | 초가(Lv1~4)·기와(Lv5~11)·큰 곳간(Lv12+) | 21:9 2k → 투명 480px ×3 | Nano Banana Pro | 2 | `barn-1/2/3.webp` (17·19·27KB) |
| S2 소품 시트 → squirrel-cheer·think, acorn, grain | 결과·빈 화면·칩·파티클 | 환호·생각하는 다람쥐, 도토리, 낱알 | 1:1 2k 2×2 → 투명 480/128px | Nano Banana Pro | 2 | `squirrel-cheer.webp`(17KB) `squirrel-think.webp`(18KB) `acorn.webp`(4KB) `grain.webp`(6KB) |
| B1 bg-hills | 홈 영상 합성 재료 | 한지 하늘·클레이 언덕 | 9:16 2k | Nano Banana Pro | 2 | (앱에 직접 넣지 않음) |
| V1~V3 hero-1·2·3 | 홈 디오라마 | 곳간 단계별 반복 영상 | 1:1 5s 960 → 720px | Kling 3.0 std, 소리 없음 | 7.5×3 + 다시 만든 2편 15 | `hero-1/2/3.mp4` (71·71·77KB) + 정지 그림 `hero-1/2/3.webp` |
| V4 levelup | 결과(레벨업) | 환호하며 낱알이 흩날림 | 1:1 5s 960 → 720px | Kling 3.0 std, 소리 없음 | 7.5 | `levelup.mp4` (235KB) + `levelup.webp` |
| I1 icon-art | 앱 아이콘·favicon | 손 흔드는 다람쥐 상반신 | 1:1 2k | Nano Banana Pro | 2 | `assets/images/android-icon-*.png`, `icon.png`, `favicon.png` |
| (로컬) splash | 스플래시 | A1 잘라 쓰기 | 512px | — | 0 | `assets/images/splash-icon.png` |

V2·V3은 처음 판에서 곳간 벽이 비어 보였다(위 3번의 배경 제거 문제). 원인을 고쳐 다시 합성하고 다시 만들었다.

## 프롬프트 (요약)

공통 꼬리말: *soft matte clay 3D render, vinyl toy, rounded simplified forms, warm morning sunlight from top-left, soft contact shadow, plain flat pure white background, no text, no watermark* + A1 참조 이미지.

- **A1**: chubby squirrel vinyl toy, chestnut-orange fur, cream belly, big curled tail, glossy black eyes, hugging a small golden rice bundle, 3/4 view.
- **S1**: three separate Korean granaries in one row — thatched straw roof (초가) / dark curved tiled roof on stone base with rice sacks (기와) / grand two-storey with dancheong eaves and a heap of rice grains.
- **S2**: 2×2 sheet — the same squirrel cheering with grains flying / sitting reading a small book, head tilted / glossy acorn / rice bundle with loose grains.
- **B1**: vertical diorama background, cream hanji-textured sky, layered sage and ochre clay hills, tiny pines, empty cream ground in the bottom third.
- **V1~V3**: seamless gentle idle loop, locked-off static camera; squirrel breathes, blinks, tail sways; granary perfectly still; returns exactly to the starting pose.
- **V4**: squirrel hops with arms raised, gentle shower of golden grains, lands back in the starting pose.
- **I1**: close-up bust of the same squirrel waving, rice bundle by its cheek, bold readable silhouette inside a centered circle.

## 대체 그림·실패 대응

- 영상: 첫 프레임을 그리기 전, 그리고 '애니메이션 제거' 설정에서는 영상 첫 프레임을 뽑은 정지 그림(`hero-N.webp`, `levelup.webp`)을 보인다. 영상이 재생되지 않아도 같은 장면이 보인다.
- 글꼴: 불러오기에 실패하면 시스템 글꼴로 연다(`_layout.tsx`).
- 자산을 다시 만들 때: 같은 프롬프트에 A1 참조를 넣는다. 배경 제거는 `rembg` 후 구멍 메우기, 합성은 바닥선(GROUND)을 맞춘다.

## 사용 권리

Higgsfield 도움말은 생성물의 소유권을 주장하지 않으며 상업적 이용이 요금제에 묶여 있지 않다고 안내한다(2026-11 확인). 다만 제3자 FAQ 중에는 무료 플랜 상업 이용을 제한한다는 오래된 글도 있어, 출시 전에 현재 이용약관을 한 번 더 확인했다(2026-11-20, https://higgsfield.ai/terms, 최종 갱신 2026-10-23): 4.4항 "Company does not claim ownership of any of your Inputs or Outputs, nor does it restrict your commercial use of Outputs." 1~8항에는 요금제별 예외가 없다(9~10항 구독·크레딧 조항은 원문 전체를 확인하지 못함). 함께 지킬 것: 법이 요구하면 AI 생성물임을 밝힌다(5.5항), 사람이 그렸다고 하지 않는다(5.2항), 회사가 요청하면 해당 생성물 사용을 멈춘다(6.6항), 생성물이 유일하다는 보장은 없다(4.4항). 원본은 로컬에 보관한다(3.4항 보관 기간은 요금제별). 생성물에 워터마크는 없다(육안 확인). 고운바탕 글꼴은 SIL OFL 1.1(`assets/fonts/OFL-GowunBatang.txt`, 예약 글꼴 이름 없음).

AI 생성물 표시(2026-11-21 확인): 인공지능 기본법(2026-01-22 시행)의 생성형 AI 결과물 표시 의무는 AI 제품·서비스를 제공하는 **AI사업자**에게 있고, 생성 도구로 그림을 만들어 쓰는 이용자에게는 없다. 그래도 약관 5.2·5.5항과 맞추려고 설정 화면 출처 줄에 `그림·영상: AI 생성(Higgsfield)`를 넣었다(`src/core/labels.ts`). 사람 얼굴이나 실존 인물을 닮은 딥페이크가 아니므로 그 밖의 표시 요건은 해당하지 않는다.
