// 앱 정보: 개인정보처리방침 주소, 테스트 모드를 열 수 있는 빌드인지.
import { SHARE_URL } from './challenge';

// 웹 저장소 public/app/privacy.html. 앱은 개인정보를 모으지 않는다는 안내(Play Console에도 이 주소를 적는다).
export const PRIVACY_URL = `${SHARE_URL}/app/privacy.html`;

// 테스트 모드(정답 보기)는 개발 실행과 preview 빌드(eas.json의 EXPO_PUBLIC_TEST_MODE=1)에서만 연다. Play 빌드에서는 열리지 않는다.
export function testModeAllowed(isDev: boolean, flag: string | undefined): boolean {
  return isDev || flag === '1';
}
