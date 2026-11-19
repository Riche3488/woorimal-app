// 게임 화면의 작은 조각들: 하트, 남은 시간 바, 출처 표시, 다람쥐, 곳간.
import { Text, View, StyleSheet } from 'react-native';
import { barnFor } from '../core/growth';
import { sourceNote } from '../core/labels';
import type { Source } from '../core/types';
import { C } from '../ui/theme';

export function Hearts({ hearts, max = 3 }: { hearts: number; max?: number }) {
  return (
    <View style={s.row} accessibilityRole="text">
      {Array.from({ length: max }, (_, i) =>
        i < hearts
          ? <Text key={i} style={s.heart} accessibilityLabel="남은 하트">❤️</Text>
          : <Text key={i} style={[s.heart, s.lost]} accessibilityLabel="잃은 하트">🤍</Text>)}
    </View>
  );
}

export function TimerBar({ ratio }: { ratio: number }) {
  const r = Math.max(0, Math.min(1, ratio));
  const color = r > 0.5 ? C.grain : r > 0.25 ? C.accent : C.bad;
  return (
    <View style={s.track} accessibilityLabel="남은 시간">
      <View style={[s.fill, { width: `${r * 100}%`, backgroundColor: color }]} />
    </View>
  );
}

export function SourceNote({ source }: { source: Source }) {
  const note = sourceNote(source);
  return note ? <Text style={s.source}>{note}</Text> : null;
}

// 1차 자리 표시자: 레벨이 오를수록 다람쥐가 커진다.
export function Squirrel({ level, size = 1 }: { level: number; size?: number }) {
  const fontSize = Math.round((36 + Math.min(level, 20) * 2) * size);
  return <Text style={{ fontSize }} accessibilityLabel={`다람쥐 ${level}레벨`}>🐿️</Text>;
}

const BARN_ICON: Record<string, string> = { '초가 곳간': '🛖', '기와 곳간': '🏠', '큰 곳간': '🏯' };
export function Barn({ level, size = 1 }: { level: number; size?: number }) {
  const barn = barnFor(level);
  return (
    <View style={s.barn}>
      <Text style={{ fontSize: Math.round(44 * size) }}>{BARN_ICON[barn.name]}</Text>
      <Text style={s.barnName}>{barn.name}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', gap: 2 },
  heart: { fontSize: 20 },
  lost: { opacity: 0.5 },
  track: { height: 8, borderRadius: 4, backgroundColor: C.line, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },
  source: { marginTop: 10, fontSize: 11, color: C.faint, textAlign: 'right' },
  barn: { alignItems: 'center' },
  barnName: { fontSize: 12, color: C.sub, marginTop: 2 },
});
