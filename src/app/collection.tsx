// 곳간 낱말: 외운 낱말(간격 복습을 마친 낱말)을 곳간에 쌓인 낟가리처럼 모아 보여 준다. 눌러서 해설 보기.
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { wordCollection } from '../core/collection';
import { useGame } from '../state/GameProvider';
import { C, paperCard, R, T } from '../ui/theme';

export default function Collection() {
  const { pack, save } = useGame();
  const { mastered, known } = useMemo(() => wordCollection(save.progress, pack.questions), [save.progress, pack.questions]);
  const [open, setOpen] = useState<string | null>(null);
  const opened = mastered.find(w => w.word === open);

  return (
    <SafeAreaView style={s.screen}>
      <View style={s.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}><Text style={s.back}>‹ 뒤로</Text></Pressable>
        <Text style={s.title}>곳간 낱말</Text>
        <View style={{ width: 48 }} />
      </View>
      <ScrollView contentContainerStyle={s.content}>
        <View style={s.summary}>
          <View style={s.stat}><Text style={s.statNum}>{mastered.length}</Text><Text style={s.statLabel}>외운 낱말</Text></View>
          <View style={s.stat}><Text style={s.statNum}>{known}</Text><Text style={s.statLabel}>맞혀 본 낱말</Text></View>
        </View>
        <Text style={s.help}>오답노트 복습을 세 번 이어서 맞히면 외운 낱말로 곳간에 들어와요</Text>
        {mastered.length === 0 ? (
          <Text style={s.empty}>아직 곳간이 비어 있어요. 틀린 문제를 복습해 보세요</Text>
        ) : (
          <View style={s.grid}>
            {mastered.map(w => (
              <Pressable key={w.word} onPress={() => setOpen(open === w.word ? null : w.word)} accessibilityRole="button"
                style={[s.chip, open === w.word && s.chipOn]}>
                <Text style={s.chipText}>{w.word}</Text>
              </Pressable>
            ))}
          </View>
        )}
        {opened ? (
          <View style={s.detail}>
            <Text style={s.detailWord}>{opened.word}</Text>
            <Text style={s.detailText}>{opened.explain || '해설이 아직 없어요'}</Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12 },
  back: { fontSize: 16, color: C.sub, fontWeight: '700', width: 48 },
  title: { ...T.title, fontSize: 20 },
  content: { padding: 18, gap: 14, paddingBottom: 40 },
  summary: { flexDirection: 'row', gap: 10 },
  stat: { ...paperCard, flex: 1, alignItems: 'center', paddingVertical: 14 },
  statNum: { ...T.num, fontSize: 28, color: C.grainDeep },
  statLabel: { fontSize: 13, color: C.sub, fontWeight: '700' },
  help: { fontSize: 13, color: C.faint, lineHeight: 19 },
  empty: { fontSize: 15, color: C.sub, textAlign: 'center', marginTop: 24 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: R.pill, backgroundColor: C.grainSoft, borderWidth: 1, borderColor: C.grain },
  chipOn: { backgroundColor: C.grain },
  chipText: { fontSize: 15, color: C.ink, fontWeight: '700' },
  detail: { ...paperCard, padding: 16, gap: 6 },
  detailWord: { ...T.heading },
  detailText: { fontSize: 14, lineHeight: 21, color: C.sub },
});
