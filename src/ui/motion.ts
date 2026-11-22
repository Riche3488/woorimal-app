// 움직임 원칙: 의미 있을 때만, 짧게(200~350ms), 반복은 느리고 작게.
// 시스템 '애니메이션 제거'가 켜져 있으면 반복·파티클·흔들림을 끄고 바로 결과를 보인다.
import { Easing, FadeInDown, ReduceMotion } from 'react-native-reanimated';
import { Platform } from 'react-native';

export const DUR = { quick: 160, base: 260, slow: 420, float: 3000 };
export const EASE = { out: Easing.out(Easing.cubic), inOut: Easing.inOut(Easing.sin) };
export const STAGGER = 60;
// 웹의 레이아웃 애니메이션은 out(cubic) 함수를 CSS 곡선으로 변환하지 못한다.
const ENTER_EASE = Platform.OS === 'web' ? Easing.bezier(0.22, 1, 0.36, 1) : EASE.out;

// 차례로 아래에서 떠오르는 등장. 시스템 설정에 따라 저절로 꺼진다.
export const enterUp = (i = 0) =>
  FadeInDown.duration(DUR.base).delay(i * STAGGER).easing(ENTER_EASE).reduceMotion(ReduceMotion.System);
