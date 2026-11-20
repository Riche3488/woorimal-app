// 장면·연출 조각: 눌림 깊이가 있는 버튼, 홈 디오라마 영상, 레벨업 영상, 낱알 터짐, 흔들림.
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useFocusEffect } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withSequence, withSpring, withTiming,
} from 'react-native-reanimated';
import { ART, VIDEO } from '../../assets/art';
import { DUR } from '../ui/motion';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// 눌리면 살짝 내려앉는 버튼(아래 테두리가 얇아지는 깊이). 선택적으로 가벼운 햅틱.
export function PressableScale({ style, children, haptic = false, onPressIn, onPressOut, ...rest }:
  PressableProps & { style?: StyleProp<ViewStyle>; haptic?: boolean; children: React.ReactNode }) {
  const down = useSharedValue(0);
  const st = useAnimatedStyle(() => ({ transform: [{ translateY: down.value * 2 }, { scale: 1 - down.value * 0.015 }] }));
  return (
    <AnimatedPressable {...rest} style={[style, st]}
      onPressIn={e => { down.value = withTiming(1, { duration: 70 }); if (haptic) Haptics.selectionAsync().catch(() => {}); onPressIn?.(e); }}
      onPressOut={e => { down.value = withSpring(0, { damping: 14, stiffness: 260 }); onPressOut?.(e); }}>
      {children}
    </AnimatedPressable>
  );
}

// 영상이 첫 프레임을 그리기 전과, 움직임을 줄인 설정에서는 같은 장면의 정지 그림을 보인다.
function LoopVideo({ source, poster, loop, onEnd, style }: {
  source: number; poster: number; loop: boolean; onEnd?: () => void; style?: StyleProp<ViewStyle>;
}) {
  const [ready, setReady] = useState(false);
  const player = useVideoPlayer(source, p => { p.loop = loop; p.muted = true; p.audioMixingMode = 'mixWithOthers'; });
  // 화면에 보일 때만 재생한다.
  useFocusEffect(useCallback(() => {
    player.play();
    return () => player.pause();
  }, [player]));
  useEffect(() => {
    if (!onEnd) return;
    const sub = player.addListener('playToEnd', onEnd);
    return () => sub.remove();
  }, [player, onEnd]);
  return (
    <View style={style}>
      <Image source={poster} style={StyleSheet.absoluteFill} contentFit="cover" accessible={false} />
      <VideoView player={player} style={[s.fill, { opacity: ready ? 1 : 0 }]} contentFit="cover"
        nativeControls={false} allowsPictureInPicture={false} onFirstFrameRender={() => setReady(true)} />
    </View>
  );
}

function Still({ source, style }: { source: number; style?: StyleProp<ViewStyle> }) {
  return <View style={style}><Image source={source} style={StyleSheet.absoluteFill} contentFit="cover" accessible={false} /></View>;
}

// 홈 디오라마: 곳간 단계마다 다른 영상(처음과 끝이 같은 장면이라 끊김 없이 돈다).
export function HeroScene({ stage, style }: { stage: number; style?: StyleProp<ViewStyle> }) {
  const reduce = useReducedMotion();
  const poster = ART.hero[stage];
  if (reduce) return <Still source={poster} style={style} />;
  return <LoopVideo key={stage} source={VIDEO.hero[stage]} poster={poster} loop style={style} />;
}

// 레벨업 영상: 한 번 재생하고 끝나면 마지막 장면(시작과 같은 그림)에 머문다.
export function LevelUpScene({ style }: { style?: StyleProp<ViewStyle> }) {
  const reduce = useReducedMotion();
  if (reduce) return <Still source={ART.levelUp} style={style} />;
  return <LoopVideo source={VIDEO.levelUp} poster={ART.levelUp} loop={false} style={style} />;
}

// 정답 때 낱알이 위로 흩어지며 사라진다. trigger가 바뀔 때마다 한 번.
const GRAINS = [
  { x: -70, y: -60, r: -30, d: 0 }, { x: -36, y: -92, r: 20, d: 30 }, { x: 0, y: -110, r: -10, d: 10 },
  { x: 38, y: -88, r: 35, d: 40 }, { x: 72, y: -56, r: -25, d: 20 }, { x: -18, y: -70, r: 50, d: 60 }, { x: 22, y: -64, r: -45, d: 50 },
];
function Grain({ x, y, r, d, run }: { x: number; y: number; r: number; d: number; run: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    if (!run) return;
    t.value = 0;
    t.value = withDelay(d, withTiming(1, { duration: 700, easing: Easing.out(Easing.quad) }));
  }, [run, d, t]);
  const st = useAnimatedStyle(() => ({
    opacity: t.value === 0 ? 0 : 1 - t.value,
    transform: [{ translateX: x * t.value }, { translateY: y * t.value }, { rotate: `${r * t.value}deg` }, { scale: 0.6 + t.value * 0.5 }],
  }));
  return <Animated.Image source={ART.grain} style={[s.grain, st]} />;
}

export function GrainBurst({ trigger }: { trigger: number }) {
  const reduce = useReducedMotion();
  if (reduce || !trigger) return null;
  return (
    <View pointerEvents="none" style={s.burst}>
      {GRAINS.map((g, i) => <Grain key={i} {...g} run={trigger} />)}
    </View>
  );
}

// 오답 때 좌우로 짧게 흔든다. trigger가 바뀔 때마다 한 번.
export function Shake({ trigger, children, style }: { trigger: number; children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const reduce = useReducedMotion();
  const x = useSharedValue(0);
  useEffect(() => {
    if (!trigger || reduce) return;
    const step = (v: number) => withTiming(v, { duration: 55 });
    x.value = withSequence(step(-9), step(8), step(-6), step(4), step(0));
  }, [trigger, reduce, x]);
  const st = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  return <Animated.View style={[st, style]}>{children}</Animated.View>;
}

// 결과 화면 등에서 숫자·제목이 톡 튀어 오르는 강조.
export function Pop({ trigger, children, style }: { trigger: unknown; children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const reduce = useReducedMotion();
  const sc = useSharedValue(1);
  useEffect(() => {
    if (reduce) return;
    sc.value = withSequence(withTiming(1.18, { duration: DUR.quick }), withSpring(1, { damping: 8, stiffness: 200 }));
  }, [trigger, reduce, sc]);
  const st = useAnimatedStyle(() => ({ transform: [{ scale: sc.value }] }));
  return <Animated.View style={[st, style]}>{children}</Animated.View>;
}

const s = StyleSheet.create({
  // 웹의 <video>가 원래 크기로 그려지지 않게 너비·높이를 꼭 지정한다.
  fill: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' },
  burst: { position: 'absolute', left: '50%', top: 28, width: 0, height: 0, alignItems: 'center', justifyContent: 'center' },
  grain: { position: 'absolute', width: 26, height: 26 },
});
