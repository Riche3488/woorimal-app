// Jest에서 Reanimated 4를 대신하는 작은 모의 모듈.
// 패키지의 공식 mock은 4.7에서 네이티브 초기화(setCSSEventHandler)를 거치다 Jest에서 실패해서,
// 이 앱이 쓰는 API만 즉시 끝나는 값으로 흉내 낸다. 새 API를 쓰면 여기에 더한다.
jest.mock('react-native-reanimated', () => {
  const RN = require('react-native');
  const now = (to, cb) => { cb?.(true); return to; };
  const builder = () => {
    const b = { duration: () => b, delay: () => b, easing: () => b, reduceMotion: () => b, springify: () => b };
    return b;
  };
  const ease = () => (t) => t;
  const Easing = { linear: ease(), quad: ease(), cubic: ease(), sin: ease(), out: () => ease(), in: () => ease(), inOut: () => ease(), bezier: () => ease() };
  const Animated = {
    View: RN.View, Text: RN.Text, Image: RN.Image, ScrollView: RN.ScrollView,
    createAnimatedComponent: (C) => C,
  };
  return {
    __esModule: true,
    default: Animated,
    ...Animated,
    Easing,
    ReduceMotion: { System: 'system', Always: 'always', Never: 'never' },
    FadeInDown: builder(), FadeIn: builder(), FadeOut: builder(),
    useSharedValue: (v) => ({ value: v }),
    useAnimatedStyle: (fn) => fn(),
    useReducedMotion: () => false,
    withTiming: (to, _c, cb) => now(to, cb),
    withSpring: (to, _c, cb) => now(to, cb),
    withDelay: (_d, v) => v,
    withRepeat: (v) => v,
    withSequence: (...vs) => vs[vs.length - 1],
    cancelAnimation: () => {},
    interpolateColor: (v, input, output) => output[v >= input[input.length - 1] ? output.length - 1 : 0],
  };
});
