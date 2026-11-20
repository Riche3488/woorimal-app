// 작은 조각들: 하트, 남은 시간 바, 출처 표시, 다람쥐, 곳간, 낱알·도토리 아이콘.
import { Image } from 'expo-image';
import { useEffect, useRef } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation, interpolateColor, useAnimatedStyle, useReducedMotion, useSharedValue,
  withRepeat, withSequence, withSpring, withTiming,
} from 'react-native-reanimated';
import { ART } from '../../assets/art';
import { barnFor, barnStage } from '../core/growth';
import { sourceNote } from '../core/labels';
import type { Source } from '../core/types';
import { DUR, EASE } from '../ui/motion';
import { C } from '../ui/theme';

// 하트 하나: 잃으면 톡 커졌다가 빛이 빠지며 줄어든다.
function Heart({ on }: { on: boolean }) {
  const reduce = useReducedMotion();
  const scale = useSharedValue(1);
  const fill = useSharedValue(on ? 1 : 0);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (reduce) { fill.value = on ? 1 : 0; return; }
    fill.value = withTiming(on ? 1 : 0, { duration: DUR.base });
    if (!on) scale.value = withSequence(withTiming(1.35, { duration: 110 }), withSpring(1, { damping: 9, stiffness: 220 }));
  }, [on, reduce, fill, scale]);
  const style = useAnimatedStyle(() => ({
    color: interpolateColor(fill.value, [0, 1], [C.line, C.bad]),
    transform: [{ scale: scale.value }],
  }));
  return (
    <Animated.Text style={[s.heart, style]} accessibilityLabel={on ? '남은 하트' : '잃은 하트'}>♥</Animated.Text>
  );
}

export function Hearts({ hearts, max = 3 }: { hearts: number; max?: number }) {
  return (
    <View style={s.row} accessibilityRole="text">
      {Array.from({ length: max }, (_, i) => <Heart key={i} on={i < hearts} />)}
    </View>
  );
}

// 남은 시간: 색이 낱알빛 → 주홍 → 홍으로 바뀌고, 4분의 1 아래에서 맥박친다.
export function TimerBar({ ratio }: { ratio: number }) {
  const r = Math.max(0, Math.min(1, ratio));
  const reduce = useReducedMotion();
  const pulse = useSharedValue(1);
  const low = r > 0 && r <= 0.25;
  useEffect(() => {
    if (low && !reduce) pulse.value = withRepeat(withSequence(withTiming(0.55, { duration: 260 }), withTiming(1, { duration: 260 })), -1);
    else { cancelAnimation(pulse); pulse.value = 1; }
  }, [low, reduce, pulse]);
  const pulseStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));
  const color = r > 0.5 ? C.grain : r > 0.25 ? C.accent : C.bad;
  return (
    <View style={s.track} accessibilityLabel="남은 시간">
      <Animated.View style={[s.fill, { width: `${r * 100}%`, backgroundColor: color }, pulseStyle]} />
    </View>
  );
}

export function SourceNote({ source }: { source: Source }) {
  const note = sourceNote(source);
  return note ? <Text style={s.source}>{note}</Text> : null;
}

// 천천히 위아래로 떠다니는 래퍼(장식용). 시스템 설정이면 멈춘다.
export function Float({ children, amplitude = 4, style }: { children: React.ReactNode; amplitude?: number; style?: StyleProp<ViewStyle> }) {
  const reduce = useReducedMotion();
  const y = useSharedValue(0);
  useEffect(() => {
    if (reduce) { y.value = 0; return; }
    y.value = withRepeat(withTiming(-amplitude, { duration: DUR.float / 2, easing: EASE.inOut }), -1, true);
    return () => cancelAnimation(y);
  }, [amplitude, reduce, y]);
  const st = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  return <Animated.View style={[st, style]}>{children}</Animated.View>;
}

export type SquirrelPose = keyof typeof ART.squirrel;

// 레벨이 오를수록 다람쥐가 조금씩 커진다(Lv20에서 멈춤).
export function squirrelSize(level: number, size = 1) {
  return Math.round((84 + Math.min(level, 20) * 2.4) * size);
}

export function Squirrel({ level, size = 1, pose = 'idle' }: { level: number; size?: number; pose?: SquirrelPose }) {
  const px = squirrelSize(level, size);
  return (
    <View accessible accessibilityLabel={`다람쥐 ${level}레벨`}>
      <Image source={ART.squirrel[pose]} style={{ width: px, height: px }} contentFit="contain" cachePolicy="memory-disk" />
    </View>
  );
}

export function Barn({ level, size = 1, showName = true }: { level: number; size?: number; showName?: boolean }) {
  const barn = barnFor(level);
  const px = Math.round(110 * size);
  return (
    <View style={s.barn}>
      <Image source={ART.barn[barnStage(level)]} style={{ width: px, height: px }} contentFit="contain"
        cachePolicy="memory-disk" accessible={false} />
      {showName ? <Text style={s.barnName}>{barn.name}</Text> : null}
    </View>
  );
}

// 텍스트 옆에 쓰는 작은 3D 아이콘.
export function GrainIcon({ size = 18 }: { size?: number }) {
  return <Image source={ART.grain} style={{ width: size, height: size }} contentFit="contain" accessible={false} />;
}
export function AcornIcon({ size = 18 }: { size?: number }) {
  return <Image source={ART.acorn} style={{ width: size, height: size }} contentFit="contain" accessible={false} />;
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', gap: 4 },
  heart: { fontSize: 22, lineHeight: 26 },
  track: { height: 8, borderRadius: 4, backgroundColor: C.line, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },
  source: { marginTop: 10, fontSize: 11, color: C.faint, textAlign: 'right' },
  barn: { alignItems: 'center' },
  barnName: { fontSize: 12, color: C.sub, marginTop: 2, fontWeight: '600' },
});
