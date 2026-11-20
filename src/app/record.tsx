// 기록: 유형별 정답률(약한 유형 먼저, 누르면 그 유형 연습), 누적 판 수, 연속 기록.
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { wordCollection } from '../core/collection';
import { currentStreak, levelFor, localDay } from '../core/growth';
import { TYPE_LABELS } from '../core/labels';
import { typeAccuracy } from '../core/progress';
import type { QuestionType } from '../core/types';
import { useGame } from '../state/GameProvider';
import { Image } from 'expo-image';
import Animated from 'react-native-reanimated';
import { ART } from '../../assets/art';
import { enterUp } from '../ui/motion';
import { C, paperCard, R, T } from '../ui/theme';

export default function Record() {
  const { pack, save } = useGame();
  const rows = typeAccuracy(save.progress, pack.questions);
  const solved = Object.keys(save.progress.stats).length;

  return (
    <SafeAreaView style={s.screen}>
      <View style={s.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}><Text style={s.back}>‹ 뒤로</Text></Pressable>
        <Text style={s.title}>내 기록</Text>
        <View style={{ width: 48 }} />
      </View>
      <ScrollView contentContainerStyle={s.content}>
        <View style={s.summary}>
          <Item label="레벨" value={`Lv.${levelFor(save.totalGrains).level}`} />
          <Item label="푼 판" value={`${save.rounds}`} />
          <Item label="연속" value={`${currentStreak(save.streak, localDay(new Date()))}일`} />
          <Item label="푼 문제" value={`${solved}`} />
        </View>

        <Pressable onPress={() => router.push('/collection')} style={({ pressed }) => [s.row, pressed && { opacity: 0.7 }]} accessibilityRole="button">
          <View style={s.rowTop}>
            <Text style={s.rowLabel}>곳간 낱말</Text>
            <Text style={s.rowValue}>외운 낱말 {wordCollection(save.progress, pack.questions).mastered.length}개  <Text style={s.practice}>보기 ›</Text></Text>
          </View>
        </Pressable>

        <Text style={s.section}>유형별 정답률 (약한 유형부터 · 누르면 연습)</Text>
        {rows.length === 0 && (
          <View style={s.emptyBox}>
            <Image source={ART.squirrel.think} style={s.emptyArt} contentFit="contain" accessible={false} />
            <Text style={s.empty}>아직 기록이 없어요. 한 판 풀어 보세요.</Text>
          </View>
        )}
        {rows.map((r, i) => (
          <Animated.View key={r.type} entering={enterUp(Math.min(i, 6))}>
          <Pressable onPress={() => router.push({ pathname: '/play', params: { mode: 'practice', type: r.type } })}
            style={({ pressed }) => [s.row, pressed && { opacity: 0.7 }]} accessibilityRole="button">
            <View style={s.rowTop}>
              <Text style={s.rowLabel}>{TYPE_LABELS[r.type as QuestionType] ?? r.type}</Text>
              <Text style={s.rowValue}>{Math.round(r.rate * 100)}% <Text style={s.rowSub}>({r.correct}/{r.total})</Text>  <Text style={s.practice}>연습 ›</Text></Text>
            </View>
            <View style={s.track}><View style={[s.fill, { width: `${r.rate * 100}%`, backgroundColor: r.rate < 0.5 ? C.bad : r.rate < 0.8 ? C.grain : C.good }]} /></View>
          </Pressable>
          </Animated.View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.item}>
      <Text style={s.itemValue}>{value}</Text>
      <Text style={s.itemLabel}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12 },
  back: { fontSize: 16, color: C.sub, fontWeight: '700', minWidth: 48 },
  title: { ...T.title, fontSize: 20 },
  content: { padding: 20, gap: 12 },
  summary: { flexDirection: 'row', gap: 8 },
  item: { ...paperCard, flex: 1, paddingVertical: 14, alignItems: 'center' },
  itemValue: { ...T.num, fontSize: 20, lineHeight: 28 },
  itemLabel: { fontSize: 12, color: C.sub, marginTop: 2 },
  section: { fontSize: 14, fontWeight: '700', color: C.sub, marginTop: 12 },
  emptyBox: { alignItems: 'center', marginTop: 12, gap: 6 },
  emptyArt: { width: 140, height: 140 },
  empty: { color: C.sub, fontSize: 15, fontWeight: '600' },
  row: { ...paperCard, padding: 14, gap: 8 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between' },
  rowLabel: { fontSize: 15, fontWeight: '700', color: C.ink },
  rowValue: { fontSize: 15, fontWeight: '700', color: C.ink },
  practice: { fontSize: 13, color: C.accent, fontWeight: '700' },
  rowSub: { fontSize: 12, color: C.sub, fontWeight: '400' },
  track: { height: 8, borderRadius: 4, backgroundColor: C.line, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },
});
