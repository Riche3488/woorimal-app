// 홈: 곳간 디오라마(단계별 영상)·다람쥐 레벨·연속 기록·오늘 목표·도토리, 한 판 시작, 오답노트.
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, Share, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HeroScene, PressableScale } from '../components/art';
import { AcornIcon, GrainIcon } from '../components/bits';
import { cardOfDay } from '../core/cards';
import { CHALLENGE_SIZE, challengeNumber, markScore, marksToEmoji, shareText } from '../core/challenge';
import { DAILY_GOAL, todayRounds } from '../core/goals';
import { barnFor, barnStage, currentStreak, levelFor, localDay } from '../core/growth';
import { useGame } from '../state/GameProvider';
import { DUR, EASE, enterUp } from '../ui/motion';
import { C, elevation, paperCard, R, T } from '../ui/theme';

export default function Home() {
  const { pack, save, counts } = useGame();
  const lv = levelFor(save.totalGrains);
  const today = localDay(new Date());
  const streak = currentStreak(save.streak, today);
  const done = todayRounds(save.daily, today);
  const freezes = save.streak.freezes ?? 0;
  const challengeDone = save.challenge.day === today;
  const card = cardOfDay(pack.cards, today);
  const cardDone = save.card.day === today;
  const haptic = save.settings.haptics;
  const openChallenge = () => {
    if (!challengeDone) router.push({ pathname: '/play', params: { mode: 'challenge' } });
    else Share.share({ message: shareText({ day: today, marks: save.challenge.marks, streak }) }).catch(() => {});
  };

  return (
    <SafeAreaView style={s.screen}>
      <View style={s.header}>
        <Text style={s.title}>우리말 곳간</Text>
        <View style={s.links}>
          <Pressable onPress={() => router.push('/record')} hitSlop={8} style={s.link}><Text style={s.linkText}>기록</Text></Pressable>
          <Pressable onPress={() => router.push('/settings')} hitSlop={8} style={s.link}><Text style={s.linkText}>설정</Text></Pressable>
        </View>
      </View>

      <Animated.View entering={enterUp(0)} style={s.diorama}>
        <HeroScene stage={barnStage(lv.level)} style={StyleSheet.absoluteFill} />
        <View style={s.badge} accessible accessibilityLabel={`다람쥐 ${lv.level}레벨 · ${barnFor(lv.level).name}`}>
          <Text style={s.badgeLv}>Lv.{lv.level}</Text>
          <Text style={s.badgeBarn}>{barnFor(lv.level).name}</Text>
        </View>
      </Animated.View>

      <Animated.View entering={enterUp(1)} style={s.status}>
        <View style={s.levelRow}>
          <Text style={s.level}>다람쥐 Lv.{lv.level}</Text>
          <Text style={s.xpText}>다음 레벨까지 낱알 {lv.need - lv.into}개</Text>
        </View>
        <XpBar ratio={lv.into / lv.need} />
        <View style={s.chips}>
          <View style={[s.chip, streak > 0 && s.chipHot]}>
            <Text style={[s.chipText, streak > 0 && { color: C.accent }]}>{streak > 0 ? `🔥 ${streak}일 연속` : '오늘 첫 판을 시작해 보세요'}</Text>
          </View>
          <View style={s.chip} accessibilityLabel={`오늘 목표 ${Math.min(done, DAILY_GOAL)}/${DAILY_GOAL}판`}>
            {Array.from({ length: DAILY_GOAL }, (_, i) => (
              <View key={i} style={{ opacity: i < done ? 1 : 0.22 }}><GrainIcon size={16} /></View>
            ))}
            <Text style={s.chipText}>{done >= DAILY_GOAL ? '오늘 목표 달성' : `오늘 ${Math.min(done, DAILY_GOAL)}/${DAILY_GOAL}판`}</Text>
          </View>
          {freezes > 0 && (
            <View style={s.chip} accessibilityLabel={`도토리 ${freezes}개`}>
              <AcornIcon size={16} /><Text style={s.chipText}>{freezes}</Text>
            </View>
          )}
        </View>
        <Text style={s.total}>모은 낱알 {save.totalGrains.toLocaleString()}개</Text>
      </Animated.View>

      <View style={s.actions}>
        <Animated.View entering={enterUp(2)}>
          <PressableScale onPress={openChallenge} haptic={haptic} style={s.challenge} accessibilityRole="button">
            <View style={s.seal}><Text style={s.sealText}>오늘</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={s.challengeTitle}>오늘의 문제 #{challengeNumber(today)}</Text>
              <Text style={s.challengeSub}>
                {challengeDone
                  ? `${marksToEmoji(save.challenge.marks)} ${markScore(save.challenge.marks)}/${save.challenge.marks.length} · 공유하기`
                  : `모두에게 같은 ${CHALLENGE_SIZE}문제 · 하루 한 번`}
              </Text>
            </View>
            <Text style={s.chev}>›</Text>
          </PressableScale>
        </Animated.View>
        {card ? (
          <Animated.View entering={enterUp(2)}>
            <Pressable onPress={() => router.push('/card')} style={s.wordRow} accessibilityRole="button"
              accessibilityLabel={`오늘의 낱말 ${card.word}${cardDone ? ', 풀었어요' : ''}`}>
              <Text style={s.wordLabel}>오늘의 낱말</Text>
              <Text style={s.wordText} numberOfLines={1}>{card.word}</Text>
              <Text style={[s.wordState, cardDone && { color: C.good }]}>{cardDone ? '✓ 풀었어요' : '읽고 풀기 ›'}</Text>
            </Pressable>
          </Animated.View>
        ) : null}
        <Animated.View entering={enterUp(3)}>
          <PressableScale onPress={() => router.push({ pathname: '/play', params: { mode: 'normal' } })} haptic={haptic}
            style={s.primary} accessibilityRole="button">
            <Text style={s.primaryText}>한 판 시작</Text>
            <Text style={s.primarySub}>10문제 · 하트 3개</Text>
          </PressableScale>
        </Animated.View>
        <Animated.View entering={enterUp(4)}>
          <PressableScale onPress={() => router.push('/notebook')} style={s.secondary} accessibilityRole="button">
            <Text style={s.secondaryText}>오답노트</Text>
            {counts.due > 0
              ? <View style={s.dueBadge}><Text style={s.dueText}>오늘 복습 {counts.due}</Text></View>
              : <Text style={s.secondarySub}>오늘 복습 {counts.due}</Text>}
          </PressableScale>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

// 경험치 바: 처음 열 때 0에서 채워진다.
function XpBar({ ratio }: { ratio: number }) {
  const reduce = useReducedMotion();
  const w = useSharedValue(reduce ? ratio : 0);
  useEffect(() => {
    w.value = reduce ? ratio : withDelay(DUR.base, withTiming(ratio, { duration: DUR.slow * 2, easing: EASE.out }));
  }, [ratio, reduce, w]);
  const st = useAnimatedStyle(() => ({ width: `${Math.max(0.02, w.value) * 100}%` }));
  return (
    <View style={s.xpTrack}>
      <Animated.View style={[s.xpFill, st]}><View style={s.xpShine} /></Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg, paddingHorizontal: 18 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, paddingBottom: 10 },
  title: { ...T.title, fontSize: 24 },
  links: { flexDirection: 'row', gap: 8 },
  link: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: R.pill, backgroundColor: C.paper, borderWidth: 1, borderColor: C.line },
  linkText: { fontSize: 14, color: C.sub, fontWeight: '700' },
  diorama: { flex: 1, minHeight: 200, maxHeight: 400, borderRadius: 28, overflow: 'hidden', backgroundColor: C.grainSoft, borderWidth: 1, borderColor: C.line, ...elevation(2) },
  badge: { position: 'absolute', left: 14, top: 14, flexDirection: 'row', alignItems: 'baseline', gap: 6, paddingVertical: 6, paddingHorizontal: 12, borderRadius: R.pill, backgroundColor: 'rgba(255,253,248,0.9)' },
  badgeLv: { ...T.num, fontSize: 18, color: C.accent },
  badgeBarn: { fontSize: 12, color: C.sub, fontWeight: '700' },
  status: { paddingTop: 16, paddingBottom: 6, gap: 8 },
  levelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  level: { ...T.title, fontSize: 21 },
  xpText: { fontSize: 13, color: C.sub, fontWeight: '600' },
  xpTrack: { height: 12, borderRadius: 6, backgroundColor: C.line, overflow: 'hidden' },
  xpFill: { height: '100%', borderRadius: 6, backgroundColor: C.grain, overflow: 'hidden' },
  xpShine: { position: 'absolute', left: 0, right: 0, top: 0, height: 4, backgroundColor: C.grainLight, opacity: 0.8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6, paddingHorizontal: 10, borderRadius: R.pill, backgroundColor: C.paper, borderWidth: 1, borderColor: C.line },
  chipHot: { borderColor: '#EBC3AE', backgroundColor: '#FCEFE7' },
  chipText: { fontSize: 13, color: C.sub, fontWeight: '700', marginLeft: 2 },
  total: { fontSize: 12, color: C.faint },
  actions: { gap: 10, paddingTop: 8, paddingBottom: 16 },
  challenge: { ...paperCard, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 14, borderColor: C.grain, borderWidth: 1.5, backgroundColor: '#FFF8E8' },
  seal: { width: 42, height: 42, borderRadius: 8, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-4deg' }] },
  sealText: { fontFamily: T.num.fontFamily, color: '#FFF4E6', fontSize: 14 },
  challengeTitle: { ...T.heading, fontSize: 17 },
  challengeSub: { color: C.sub, fontSize: 13, marginTop: 3, fontWeight: '600' },
  chev: { fontSize: 26, color: C.grain, fontWeight: '300' },
  wordRow: { ...paperCard, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 14 },
  wordLabel: { fontSize: 12, color: C.accent, fontWeight: '800' },
  wordText: { flex: 1, fontFamily: T.num.fontFamily, fontSize: 18, color: C.ink },
  wordState: { fontSize: 13, color: C.sub, fontWeight: '700' },
  primary: { backgroundColor: C.ink, borderRadius: R.card, paddingVertical: 18, alignItems: 'center', borderBottomWidth: 4, borderBottomColor: '#120D09', ...elevation(2) },
  primaryText: { fontFamily: T.num.fontFamily, color: C.grainLight, fontSize: 23, lineHeight: 30 },
  primarySub: { color: '#D9CBB4', fontSize: 13, marginTop: 2, fontWeight: '600' },
  secondary: { ...paperCard, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, paddingVertical: 15 },
  secondaryText: { color: C.ink, fontSize: 16, fontWeight: '800' },
  secondarySub: { color: C.faint, fontSize: 13, fontWeight: '600' },
  dueBadge: { backgroundColor: C.accent, borderRadius: R.pill, paddingVertical: 3, paddingHorizontal: 9 },
  dueText: { color: '#fff', fontSize: 12, fontWeight: '800' },
});
