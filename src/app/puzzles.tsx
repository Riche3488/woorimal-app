// 가로세로 퍼즐 목록: 주제·난이도·진행(푼 낱말 수, 완성).
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CROSSWORD_LEVELS as LEVEL_LABELS, emptyCrossword, isComplete } from '../core/crossword';
import { useGame } from '../state/GameProvider';
import { C, paperCard, R, T } from '../ui/theme';

const LEVEL_ORDER = { easy: 0, normal: 1, hard: 2 } as const;

export default function Puzzles() {
  const { pack, save } = useGame();
  const boards = [...(pack.crosswords ?? [])].sort((a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level] || a.id.localeCompare(b.id));

  return (
    <SafeAreaView style={s.screen}>
      <View style={s.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}><Text style={s.back}>‹ 뒤로</Text></Pressable>
        <Text style={s.title}>가로세로 퍼즐</Text>
        <View style={{ width: 48 }} />
      </View>
      <ScrollView contentContainerStyle={s.content}>
        <Text style={s.help}>힌트를 보고 낱말을 통째로 입력해요. 맞힌 낱말마다 낱알 5개</Text>
        {boards.length === 0 ? <Text style={s.empty}>퍼즐을 준비하고 있어요</Text> : null}
        {boards.map(b => {
          const p = save.crosswords[b.id] ?? emptyCrossword();
          const done = isComplete(b, p);
          return (
            <Pressable key={b.id} onPress={() => router.push({ pathname: '/puzzle', params: { id: b.id } })}
              style={({ pressed }) => [s.row, done && s.rowDone, pressed && { opacity: 0.7 }]} accessibilityRole="button">
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={s.theme}>{b.theme}</Text>
                <Text style={s.meta}>{LEVEL_LABELS[b.level]} · {b.rows}×{b.cols} · 낱말 {b.entries.length}개</Text>
              </View>
              <Text style={[s.state, done && { color: C.good }]}>{done ? '✓ 완성' : p.solved.length ? `${p.solved.length}/${b.entries.length}` : '시작 ›'}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12 },
  back: { fontSize: 16, color: C.sub, fontWeight: '700', width: 48 },
  title: { ...T.title, fontSize: 20 },
  content: { padding: 18, gap: 10, paddingBottom: 40 },
  help: { fontSize: 13, color: C.faint, marginBottom: 4 },
  empty: { fontSize: 15, color: C.sub, textAlign: 'center', marginTop: 24 },
  row: { ...paperCard, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: R.card },
  rowDone: { backgroundColor: C.goodSoft },
  theme: { ...T.heading, fontSize: 16 },
  meta: { fontSize: 13, color: C.sub },
  state: { fontSize: 14, color: C.accent, fontWeight: '800' },
});
