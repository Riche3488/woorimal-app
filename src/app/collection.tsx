// 곳간 낱말: 외운 낱말(간격 복습을 마친 낱말)을 곳간에 쌓인 낟가리처럼 모아 보여 준다. 눌러서 해설 보기.
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { wordCollection, discoveredWords } from '../core/collection';
import { DECORATIONS, type DecorationId } from '../core/decorations';
import { useGame } from '../state/GameProvider';
import { C, paperCard, R, T } from '../ui/theme';
export default function Collection() {
  const game = useGame();
  const {
    pack,
    save
  } = game;
  const {
    mastered,
    known
  } = useMemo(() => wordCollection(save.progress, pack.questions), [save.progress, pack.questions]);
  const [open, setOpen] = useState<string | null>(null);
  const [tab, setTab] = useState<'discovered' | 'mastered'>('discovered');
  const discovered = useMemo(() => discoveredWords(save.progress, pack.questions, save.discoveries), [save.progress, pack.questions, save.discoveries]);
  const list = tab === 'mastered' ? mastered : discovered;
  const opened = list.find(w => w.word === open);
  return <SafeAreaView style={s.screen}>
      <View style={s.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}><Text style={s.back}>‹ 뒤로</Text></Pressable>
        <Text style={s.title}>곳간 낱말</Text>
        <View style={{
        width: 48
      }} />
      </View>
      <ScrollView contentContainerStyle={s.content}>
        <View style={s.summary}>
          <View style={s.stat}><Text style={s.statNum}>{mastered.length}</Text><Text style={s.statLabel}>외운 낱말</Text></View>
          <View style={s.stat}><Text style={s.statNum}>{discovered.length}</Text><Text style={s.statLabel}>발견한 낱말</Text></View>
        </View>
        <View style={{
        flexDirection: 'row',
        gap: 12
      }}><Pressable accessibilityRole="tab" accessibilityState={{
          selected: tab === 'discovered'
        }} onPress={() => setTab('discovered')} style={s.chip}><Text>발견 보기</Text></Pressable><Pressable accessibilityRole="tab" accessibilityState={{
          selected: tab === 'mastered'
        }} onPress={() => setTab('mastered')} style={s.chip}><Text>복습 완료 보기</Text></Pressable></View>
        <Text style={s.help}>처음 맞힌 낱말은 발견으로 모아요. 날짜를 두고 복습하면 외운 낱말이 돼요.</Text>
        {list.length === 0 ? <Text style={s.empty}>{tab === 'discovered' ? '문제를 맞히면 발견한 낱말이 여기에 모여요' : '예정일의 간격 복습을 마친 낱말이 여기에 모여요'}</Text> : <View style={s.grid}>
            {list.map(w => <Pressable key={w.word} onPress={() => setOpen(open === w.word ? null : w.word)} accessibilityRole="button" style={[s.chip, open === w.word && s.chipOn]}>
                <Text style={s.chipText}>{w.word}</Text>
              </Pressable>)}
          </View>}
        {opened ? <View style={s.detail}>
            <Text style={s.detailWord}>{opened.word}</Text>
            <Text style={s.detailText}>{opened.explain || '해설이 아직 없어요'}</Text>
          </View> : null}
        <Text style={s.title}>곳간 장식</Text>
        {(Object.keys(DECORATIONS) as DecorationId[]).map(id => {
        const item = DECORATIONS[id],
          unlocked = save.decorations.unlocked.includes(id),
          equipped = save.decorations.equipped === id;
        return <Pressable key={id} accessibilityRole="button" accessibilityState={{
          disabled: !unlocked,
          selected: equipped
        }} disabled={!unlocked} onPress={() => game.equipDecoration?.(id)} style={[s.detail, {
          opacity: unlocked ? 1 : 0.6
        }]}><Text style={s.detailWord}>{item.name}{equipped ? ' · 장착 중' : ''}</Text><Text style={s.detailText}>{unlocked ? '눌러서 곳간에 장착해요' : item.condition}</Text></Pressable>;
      })}
        {save.decorations.equipped && <Pressable accessibilityRole="button" onPress={() => game.equipDecoration?.(null)} style={s.chip}><Text>장식 해제</Text></Pressable>}
      </ScrollView>
    </SafeAreaView>;
}
const s = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: C.bg
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12
  },
  back: {
    fontSize: 16,
    color: C.sub,
    fontWeight: '700',
    minWidth: 48
  },
  title: {
    ...T.title,
    fontSize: 20
  },
  content: {
    padding: 18,
    gap: 14,
    paddingBottom: 40
  },
  summary: {
    flexDirection: 'row',
    gap: 10
  },
  stat: {
    ...paperCard,
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14
  },
  statNum: {
    ...T.num,
    fontSize: 28,
    color: C.grainDeep
  },
  statLabel: {
    fontSize: 13,
    color: C.sub,
    fontWeight: '700'
  },
  help: {
    fontSize: 13,
    color: C.faint,
    lineHeight: 19
  },
  empty: {
    fontSize: 15,
    color: C.sub,
    textAlign: 'center',
    marginTop: 24
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: R.pill,
    backgroundColor: C.grainSoft,
    borderWidth: 1,
    borderColor: C.grain
  },
  chipOn: {
    backgroundColor: C.grain
  },
  chipText: {
    fontSize: 15,
    color: C.ink,
    fontWeight: '700'
  },
  detail: {
    ...paperCard,
    padding: 16,
    gap: 6
  },
  detailWord: {
    ...T.heading
  },
  detailText: {
    fontSize: 14,
    lineHeight: 21,
    color: C.sub
  }
});
