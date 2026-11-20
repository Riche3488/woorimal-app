import { PRIVACY_URL, testModeAllowed } from '../app-info';

test('PRIVACY_URL: 웹에 둔 앱 전용 개인정보처리방침', () => {
  expect(PRIVACY_URL).toBe('https://woorimal-contest.co.kr/app/privacy.html');
});

test('testModeAllowed: 개발 실행이나 preview 빌드(EXPO_PUBLIC_TEST_MODE=1)에서만 연다', () => {
  expect(testModeAllowed(true, undefined)).toBe(true);
  expect(testModeAllowed(false, '1')).toBe(true);
  expect(testModeAllowed(false, undefined)).toBe(false);
  expect(testModeAllowed(false, '0')).toBe(false);
  expect(testModeAllowed(false, '')).toBe(false);
});
