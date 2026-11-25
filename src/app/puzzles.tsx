// 가로세로 퍼즐 목록: 주제·난이도·진행(푼 낱말 수, 완성).
// 조합 퍼즐: 문제의 낱말을 엮어 새 판을 만들고(쉬움·보통), 만든 판은 새것부터 보여 준다.
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CROSSWORD_LEVELS as LEVEL_LABELS, emptyCrossword, isComplete } from '../core/crossword';
import type { MadeLevel } from '../core/crossword-make';
import type { AppCrossword } from '../core/types';
import { useGame } from '../state/GameProvider';
import { C, paperCard, R, T } from '../ui/theme';

const LEVEL_ORDER = { easy: 0, normal: 1, hard: 2 } as const;

export default function Puzzles() {
  const { pack, save, makePuzzle } = useGame();
  const boards = [...(pack.crosswords ?? [])].sort((a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level] || a.id.localeCompare(b.id));
  const [failed, setFailed] = useState(false);
  const open = (id: string) => router.push({ pathname: '/puzzle', params: { id } });
  // 저장이 끝난 뒤에 연다. 먼저 열면 퍼즐 화면이 아직 없는 판을 찾지 못한다. 두 번 눌러도 한 판만 만든다.
  const making = useRef(false);
  const make = async (level: MadeLevel) => {
    if (making.current) return;
    making.current = true;
    try {
      const id = await makePuzzle(level);
      setFailed(!id);
      if (id) open(id);
    } finally {
      making.current = false;
    }
  };
  const row = (b: AppCrossword) => {
    const p = save.crosswords[b.id] ?? emptyCrossword();
    const done = isComplete(b, p);
    return (
      <Pressable key={b.id} onPress={() => open(b.id)}
        style={({ pressed }) => [s.row, done && s.rowDone, pressed && { opacity: 0.7 }]} accessibilityRole="button">
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={s.theme}>{b.theme}</Text>
          <Text style={s.meta}>{LEVEL_LABELS[b.level]} · {b.rows}×{b.cols} · 낱말 {b.entries.length}개</Text>
        </View>
        <Text style={[s.state, done && { color: C.good }]}>{done ? '✓ 완성' : p.solved.length ? `${p.solved.length}/${b.entries.length}` : '시작 ›'}</Text>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={s.screen}>
      <View style={s.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} accessibilityRole="button"><Text style={s.back}>‹ 뒤로</Text></Pressable>
        <Text style={s.title}>가로세로 퍼즐</Text>
        <View style={{ width: 48 }} />
      </View>
      <ScrollView contentContainerStyle={s.content}>
        <Text style={s.help}>힌트를 보고 낱말을 통째로 입력해요. 맞힌 낱말마다 낱알 5개(초성을 보면 3개)</Text>
        {boards.length ? <Text style={s.section}>주제 퍼즐</Text> : null}
        {boards.map(row)}

        <Text style={s.section}>조합 퍼즐</Text>
        <Text style={s.help}>여러 문제의 낱말을 엮어 새 판을 만들어요. 앞서 만든 판의 낱말은 되도록 피해요</Text>
        <View style={s.makeRow}>
          {(['easy', 'normal'] as const).map(level => (
            <Pressable key={level} onPress={() => void make(level)} accessibilityRole="button"
              style={({ pressed }) => [s.make, pressed && { opacity: 0.7 }]}>
              <Text style={s.makeText}>{LEVEL_LABELS[level]} 새 판</Text>
            </Pressable>
          ))}
        </View>
        {failed ? <Text style={s.fail}>지금은 판을 만들 수 없어요</Text> : null}
        {save.madeCrosswords.map(row)}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12 },
  back: { fontSize: 16, color: C.sub, fontWeight: '700', minWidth: 48 },
  title: { ...T.title, fontSize: 20 },
  content: { padding: 18, gap: 10, paddingBottom: 40 },
  help: { fontSize: 13, color: C.faint, marginBottom: 4 },
  section: { ...T.heading, fontSize: 15, marginTop: 8 },
  makeRow: { flexDirection: 'row', gap: 10 },
  make: { flex: 1, backgroundColor: C.ink, borderRadius: R.card, paddingVertical: 14, alignItems: 'center' },
  makeText: { color: C.grainLight, fontSize: 15, fontWeight: '800' },
  fail: { fontSize: 13, color: C.bad, fontWeight: '700' },
  row: { ...paperCard, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: R.card },
  rowDone: { backgroundColor: C.goodSoft },
  theme: { ...T.heading, fontSize: 16 },
  meta: { fontSize: 13, color: C.sub },
  state: { fontSize: 14, color: C.accent, fontWeight: '800' },
});
