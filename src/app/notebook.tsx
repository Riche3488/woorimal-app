// 오답노트: 복습할 문제(간격 복습) · ⭐ 담은 문제 · 외운 문제. 눌러서 정답·내 답·해설 펼치기.
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { dayDiff, localDay } from '../core/growth';
import { sourceNote, TYPE_LABELS } from '../core/labels';
import { notebook, type NotebookFilter, type QuestionStat } from '../core/progress';
import type { AppQuestion } from '../core/types';
import { useGame } from '../state/GameProvider';
import { Image } from 'expo-image';
import Animated from 'react-native-reanimated';
import { ART } from '../../assets/art';
import { enterUp } from '../ui/motion';
import { C, paperCard, R, T } from '../ui/theme';

const EMPTY: Record<NotebookFilter, string> = {
  review: '틀린 문제가 여기에 모여요',
  starred: '문제를 풀다가 ⭐를 눌러 담아 보세요',
  mastered: '세 번 맞힌 문제가 여기에 모여요',
};
const DOTS = ['', '●○○', '●●○', '●●●'];

function dueText(s: QuestionStat, today: string): string {
  if (!s.box || !s.dueDay) return s.mastered ? '외웠어요' : '';
  const d = dayDiff(today, s.dueDay);
  return `${d <= 0 ? '오늘 복습' : `${d}일 뒤`}  ${DOTS[s.box]} · 다음 복습 ${s.dueDay.slice(5).replace('-','월 ')}일`;
}

function myAnswer(s: QuestionStat): string {
  const mine = s.lastMiss === 'giveup' ? '모르겠어요' : s.lastMiss === 'timeout' ? '시간 초과' : s.lastAnswer || '(없음)';
  return `내 답: ${mine} · 틀린 횟수 ${s.wrong}`;
}

export default function Notebook() {
  const { pack, save, counts, toggleStar } = useGame();
  const [tab, setTab] = useState<NotebookFilter>('review');
  const [open, setOpen] = useState<string | null>(null);
  const today = localDay(new Date());
  const list = notebook(save.progress, pack.questions, tab, today);

  const tabs: [NotebookFilter, string][] = [
    ['review', `복습할 문제 ${counts.review}`],
    ['starred', `⭐ 담은 문제 ${counts.starred}`],
    ['mastered', `외운 문제 ${counts.mastered}`],
  ];
  const play = tab === 'review'
    ? { label: `▶ 복습 풀기 (오늘 ${counts.due})`, mode: 'review', on: counts.review > 0 }
    : tab === 'starred' ? { label: '▶ ⭐ 풀기', mode: 'starred', on: counts.starred > 0 } : null;

  return (
    <SafeAreaView style={s.screen}>
      <View style={s.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}><Text style={s.back}>‹ 뒤로</Text></Pressable>
        <Text style={s.title}>오답노트</Text>
        <View style={{ width: 48 }} />
      </View>
      <View style={s.tabs}>
        {tabs.map(([key, label]) => (
          <Pressable key={key} onPress={() => { setTab(key); setOpen(null); }} style={[s.tab, tab === key && s.tabOn]}
            accessibilityRole="tab" accessibilityState={{ selected: tab === key }}>
            <Text style={[s.tabText, tab === key && s.tabTextOn]} maxFontSizeMultiplier={1.4}>{label}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={{color:C.sub,fontSize:12,paddingHorizontal:20,paddingVertical:8}}>하트와 시간제한 없이 풀어요. 예정일 전에 맞히면 기억 단계는 유지돼요.</Text>
      {play && (
        <Pressable disabled={!play.on} onPress={() => router.push({ pathname: '/play', params: { mode: play.mode } })}
          style={({ pressed }) => [s.play, !play.on && s.disabled, pressed && s.pressed]} accessibilityRole="button">
          <Text style={s.playText}>{play.label}</Text>
        </Pressable>
      )}
      <ScrollView contentContainerStyle={s.list}>
        {list.length === 0 && (
          <Animated.View entering={enterUp(0)} style={s.emptyBox}>
            <Image source={ART.squirrel.think} style={s.emptyArt} contentFit="contain" accessible={false} />
            <Text style={s.empty}>{EMPTY[tab]}</Text>
          </Animated.View>
        )}
        {list.map(q => (
          <Row key={q.key} q={q} stat={save.progress.stats[q.key]} today={today} open={open === q.key}
            onPress={() => setOpen(open === q.key ? null : q.key)} onStar={() => toggleStar(q.key)} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ q, stat, today, open, onPress, onStar }: {
  q: AppQuestion; stat: QuestionStat; today: string; open: boolean; onPress(): void; onStar(): void;
}) {
  const note = sourceNote(q.source);
  return (
    <Pressable onPress={onPress} style={s.row} accessibilityRole="button">
      <View style={s.rowTop}>
        <Text style={s.rowType}>{TYPE_LABELS[q.type] ?? q.type}</Text>
        <Text style={s.rowDue}>{dueText(stat, today)}</Text>
        <Pressable onPress={onStar} hitSlop={10} style={s.star} accessibilityRole="button" accessibilityLabel={stat.starred ? '담기 취소' : '담기'}>
          <Text style={s.starText}>{stat.starred ? '★' : '☆'}</Text>
        </Pressable>
      </View>
      <Text style={s.prompt} numberOfLines={open ? undefined : 2}>{q.prompt}</Text>
      {open && (
        <View style={s.detail}>
          <Text style={s.answer}>정답: {q.answer}</Text>
          {stat.wrong > 0 && <Text style={s.mine}>{myAnswer(stat)}</Text>}
          {q.explain ? <Text style={s.explain}>{q.explain}</Text> : null}
          {note && <Text style={s.source}>{note}</Text>}
        </View>
      )}
    </Pressable>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12 },
  back: { fontSize: 16, color: C.sub, fontWeight: '700', minWidth: 48 },
  title: { ...T.title, fontSize: 20 },
  tabs: { flexDirection: 'row', gap: 6, paddingHorizontal: 16 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: R.pill, alignItems: 'center', backgroundColor: C.paper, borderWidth: 1, borderColor: C.line },
  tabOn: { backgroundColor: C.ink, borderColor: C.ink },
  tabText: { fontSize: 13, fontWeight: '700', color: C.sub },
  tabTextOn: { color: C.grainLight },
  play: { marginHorizontal: 16, marginTop: 12, backgroundColor: '#FFF8E8', borderRadius: R.card, paddingVertical: 15, alignItems: 'center', borderWidth: 1.5, borderColor: C.grain, borderBottomWidth: 3 },
  playText: { fontSize: 16, fontWeight: '800', color: C.ink },
  disabled: { opacity: 0.4 },
  pressed: { opacity: 0.7 },
  list: { padding: 16, gap: 10 },
  emptyBox: { alignItems: 'center', marginTop: 28, gap: 6 },
  emptyArt: { width: 150, height: 150 },
  empty: { color: C.sub, fontSize: 15, textAlign: 'center', fontWeight: '600' },
  row: { ...paperCard, padding: 14, gap: 6 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowType: { fontSize: 13, color: C.accent, fontWeight: '700' },
  rowDue: { fontSize: 12, color: C.sub, fontWeight: '600' },
  star: { marginLeft: 'auto' },
  starText: { fontSize: 22, color: C.grain },
  prompt: { fontSize: 15, color: C.ink, fontWeight: '600', lineHeight: 22 },
  detail: { gap: 4, marginTop: 4 },
  answer: { fontSize: 15, color: C.good, fontWeight: '700' },
  mine: { fontSize: 13, color: C.bad },
  explain: { fontSize: 13, color: C.sub, lineHeight: 19 },
  source: { fontSize: 11, color: C.faint, textAlign: 'right' },
});
