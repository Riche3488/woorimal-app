---
name: run-android
description: Use when asked to run, launch, or screenshot the 우리말 곳간 app on the Android emulator, or to check a change in the real app (dev build via expo run:android on Windows).
---

# Android 에뮬레이터에서 앱 실행 (Windows)

개발 빌드(expo-dev-client)를 `expo run:android`로 만들어 에뮬레이터에 설치하고 Metro에 붙인다. 2026-11-22에 이 PC에서 검증한 절차다.

**경로 변수.** 셸 상태는 호출마다 사라지므로 아래 코드 블록은 각자 첫 줄에서 변수를 정한다. `<scratchpad>`는 이 세션의 scratchpad 디렉터리(시스템 프롬프트의 Windows 경로)로 바꿔 쓴다.
- Bash: `SCRATCH="$(cygpath -u '<scratchpad>')"`, `SDK="${ANDROID_HOME:-$LOCALAPPDATA\\Android\\Sdk}"`
- PowerShell: `$SCRATCH = '<scratchpad>'`

## 0. 한 번만 하는 준비

1. **긴 경로 허용(관리자 권한 필요, Claude가 대신 못 함).** 확인:
   `(Get-ItemProperty HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem).LongPathsEnabled` 값이 `1`이어야 한다.
   `0`이면 사용자에게 관리자 PowerShell에서 실행해 달라고 한다:
   `New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" -Name LongPathsEnabled -Value 1 -PropertyType DWORD -Force`
2. **CMake 3.31.6(Ninja 1.12.1).** SDK 기본 CMake 3.22.1의 Ninja는 긴 경로를 못 다뤄서
   `ninja: error: Stat(...rngesturehandler...): Filename longer than 260 characters`로 실패한다.
   SDK 폴더(`$ANDROID_HOME`, 없으면 `%LOCALAPPDATA%\Android\Sdk`) 아래 `cmake\3.31.6`이 없으면(cmdline-tools/sdkmanager가 없음) 직접 받는다:
   ```bash
   SCRATCH="$(cygpath -u '<scratchpad>')"; SDK="${ANDROID_HOME:-$LOCALAPPDATA\\Android\\Sdk}"
   curl -sSL -o "$SCRATCH/cmake.zip" https://dl.google.com/android/repository/cmake-3.31.6-windows.zip
   unzip -q "$SCRATCH/cmake.zip" -d "$(cygpath -u "$SDK")/cmake/3.31.6"
   ```
3. **`android/local.properties`에 cmake.dir 지정.** `android/`는 커밋하지 않는 생성물이라 `prebuild --clean` 뒤에는 다시 넣는다.
   슬래시는 반드시 `/`로 쓴다(`echo`로 백슬래시를 쓰면 깨져서 `CXX1301 Could not get version from cmake.dir`이 난다). `cygpath -m`이 `C:/.../cmake/3.31.6` 꼴로 바꿔 준다:
   ```bash
   SDK="${ANDROID_HOME:-$LOCALAPPDATA\\Android\\Sdk}"
   printf 'cmake.dir=%s\n' "$(cygpath -m "$SDK")/cmake/3.31.6" >> android/local.properties
   ```
   경로 오류를 겪은 뒤라면 `android/app/.cxx`를 지우고 다시 빌드한다.

## 1. 에뮬레이터 확인

```bash
adb devices                 # emulator-5554 device 가 보여야 함
emulator -list-avds         # Medium_Phone_API_36.1
```
꺼져 있으면 `emulator -avd Medium_Phone_API_36.1`을 백그라운드로 띄운다. `adb`가 응답하지 않으면 `adb kill-server; adb start-server`.

**저장 공간.** APK가 약 98MB다. `INSTALL_FAILED_INSUFFICIENT_STORAGE`가 나면 `adb shell df -h /data`를 본다. Android는 남은 공간이 약 10% 아래로 떨어지면 설치를 거부해서 앱을 하나 지우는 정도로는 풀리지 않는다.
2026-11-22에 데이터 영역을 6G에서 16G로 늘렸다. AVD 설정 파일은 `~/.android/avd/Medium_Phone.avd/config.ini`이고(`Medium_Phone_API_36.1.ini`가 그 경로를 가리킴) 값은 `disk.dataPartition.size=16G`다.
다시 늘려야 하면 사용자에게 먼저 묻는다(초기화로 에뮬레이터의 모든 앱과 데이터가 지워진다). 절차: `adb emu kill` → 값 수정 → `emulator -avd Medium_Phone_API_36.1 -wipe-data -no-snapshot-load` → `getprop sys.boot_completed`가 1이 될 때까지 기다린다.

## 2. 빌드·설치·Metro (백그라운드)

PowerShell, `run_in_background: true`:
```powershell
Set-Location D:\projects\woorimal_app
$SCRATCH = '<scratchpad>'
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"; $env:CI = "1"
npm.cmd run android -- --device emulator-5554 *> "$SCRATCH\run.log"
```
Metro가 계속 돌기 때문에 이 명령은 끝나지 않는다. 로그를 기다린다. foreground `sleep`은 하네스가 막으므로 Monitor의 until 조건(또는 `run_in_background: true`인 Bash)으로 기다리고, 끝난 알림을 받은 뒤 결과를 본다(timeout 600000):
```bash
L="$(cygpath -u '<scratchpad>')/run.log"
until grep -aqE "BUILD FAILED|CommandError|Logs for your project" "$L" 2>/dev/null; do sleep 2; done
```
```bash
L="$(cygpath -u '<scratchpad>')/run.log"
grep -a -A12 "What went wrong\|CommandError" "$L"   # 실패했을 때
```
첫 빌드는 수 분, 이후는 1분 남짓. 끝나면 `Android Bundled ... expo-router\entry.js`가 찍힌다.

## 3. 앱을 Metro에 붙여 다시 띄우기

`npm.cmd run android`는 `APP_VARIANT=development`로 빌드하므로(`scripts/expo-dev.mjs`) 패키지 이름이 `kr.co.woorimalcontest.app.dev`, 스킴이 `woorimal-dev`다(EAS development APK와 같다). `npx.cmd expo run:android`를 직접 부르지 않는다. 변수 없이 만든 예전 `android/`가 남아 있으면(`android/app/build.gradle`의 `applicationId`에 `.dev`가 없으면) `node scripts/expo-dev.mjs prebuild --clean`으로 먼저 다시 만든다. 설치 전부터 떠 있던 앱 프로세스가 남아 빈 화면이나 낡은 오류(예: `Cannot find native module 'ExpoApplication'`)를 보일 수 있다. 완전히 껐다 켠다. Git Bash에서는 `/sdcard` 같은 경로가 바뀌지 않게 `MSYS_NO_PATHCONV=1`을 준다.
```bash
export MSYS_NO_PATHCONV=1; A="adb -s emulator-5554"
$A reverse tcp:8081 tcp:8081
$A shell input keyevent KEYCODE_WAKEUP
$A shell am force-stop kr.co.woorimalcontest.app.dev
$A shell am start -a android.intent.action.VIEW \
  -d "exp+woorimal-app://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8081" kr.co.woorimalcontest.app.dev
```
첫 화면까지 30초 가까이 걸린다(처음엔 검은 화면 → 로딩 스피너 → 홈). `adb logcat -d -s ReactNativeJS`에 `Running "main"`이 찍혔는지 본다.
개발 메뉴 시트가 뜨면 `KEYCODE_BACK`으로 닫는다(X 버튼 탭은 잘 안 먹음).

## 4. 조작하고 화면 확인

```bash
A="adb -s emulator-5554"; SCRATCH="$(cygpath -u '<scratchpad>')"
$A exec-out screencap -p > "$SCRATCH/screen.png"   # Read로 열어서 실제로 본다
$A shell input tap X Y                              # 화면 좌표(1080x2400)
```
- 정상 홈: "우리말 곳간" 제목, 다람쥐 Lv.1 카드, "가볍게 5문제" 버튼(약 540,1617). 누르면 "1 / 5" 문제 화면이 나온다.
- 오른쪽 위 회색 톱니는 개발 빌드 도구 버튼이다. '설정'과 겹쳐 보여도 앱 문제가 아니다.
- 빈 화면이나 검은 화면은 실행 실패로 보고 3단계를 다시 하거나 logcat을 본다.
