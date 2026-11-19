// 결과: 정답 수·정답률·얻은 낱알, 경험치 바, 레벨업·곳간 변화 연출, 다음 목표·외운 문제 안내, 틀린 문제 보기(⭐ 담기).
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Barn, Squirrel } from '../components/bits';
import { challengeNumber, marksToEmoji, shareText } from '../core/challenge';
import { resultNudges, todayRounds } from '../core/goals';
import { barnFor, currentStreak, freezesUsed, levelFor, localDay } from '../core/growth';
import { sourceNote, TYPE_LABELS } from '../core/labels';
import { newlyMastered } from '../core/progress';
import { useGame } from '../state/GameProvider';
import { C, R } from '../ui/theme';

export default function Result() {
  const { lastRound, lastMode, lastPracticeType, previousSave, save, toggleStar } = useGame();
  const [showWrong, setShowWrong] = useState(false);
  const before = levelFor(previousSave?.totalGrains ?? 0);
  const after = levelFor(save.totalGrains);
  const leveledUp = after.level > before.level;
  const barnChanged = barnFor(after.level).name !== barnFor(before.level).name;

  const bar = useRef(new Animated.Value(leveledUp ? 0 : before.into / before.need)).current;
  const pop = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.timing(bar, { toValue: after.into / after.need, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    if (leveledUp) {
      Animated.sequence([
        Animated.timing(pop, { toValue: 1.5, duration: 300, useNativeDriver: true }),
        Animated.spring(pop, { toValue: 1, friction: 3, useNativeDriver: true }),
      ]).start();
    }
  }, [after.into, after.need, bar, leveledUp, pop]);

  if (!lastRound) {
    return <SafeAreaView style={s.screen}><Pressable onPress={() => router.replace('/')}><Text style={s.link}>홈으로</Text></Pressable></SafeAreaView>;
  }

  const total = lastRound.results.length;
  const correct = lastRound.results.filter(r => r.correct).length;
  const today = localDay(new Date());
  const used = previousSave ? freezesUsed(previousSave.streak, today) : 0;
  const nudges = resultNudges({
    beforeGrains: previousSave?.totalGrains ?? 0,
    afterGrains: save.totalGrains,
    roundGrains: lastRound.grains,
    todayRounds: todayRounds(save.daily, today),
    freezesUsed: used,
    freezeEarned: (save.streak.freezes ?? 0) > (previousSave?.streak.freezes ?? 0) - used,
    mastered: previousSave ? newlyMastered(previousSave.progress, save.progress) : 0,
  });
  const share = () => {
    Share.share({ message: shareText({ day: today, marks: save.challenge.marks, streak: currentStreak(save.streak, today) }) }).catch(() => {});
  };
  const wrong = lastRound.results
    .map((r, i) => ({ r, q: lastRound.questions[i] }))
    .filter(x => !x.r.correct);

  return (
    <SafeAreaView style={s.screen}>
      <ScrollView contentContainerStyle={s.content}>
        <Text style={s.heading}>
          {lastMode === 'challenge' ? `오늘의 문제 #${challengeNumber(today)}`
            : lastRound.hearts === 0 ? '하트를 다 썼어요'
            : lastMode === 'review' ? '복습 끝!'
            : lastMode === 'practice' && lastPracticeType ? `${TYPE_LABELS[lastPracticeType]} 연습 끝!`
            : '한 판 끝!'}
        </Text>
        {lastMode === 'challenge' && (
          <View style={s.share}>
            <Text style={s.marks} accessibilityLabel="오늘의 문제 결과">{marksToEmoji(save.challenge.marks)}</Text>
            <Pressable onPress={share} style={({ pressed }) => [s.shareBtn, pressed && s.pressed]} accessibilityRole="button">
              <Text style={s.shareText}>결과 공유</Text>
            </Pressable>
          </View>
        )}

        <View style={s.stats}>
          <Stat label="정답" value={`${correct} / ${total}`} />
          <Stat label="정답률" value={`${total ? Math.round((correct / total) * 100) : 0}%`} />
          <Stat label="낱알" value={`+${lastRound.grains}`} accent />
        </View>

        <View style={s.growth}>
          <View style={s.scene}>
            <Animated.View style={{ transform: [{ scale: pop }] }}><Squirrel level={after.level} /></Animated.View>
            <Barn level={after.level} />
          </View>
          {leveledUp && <Text style={s.levelUp}>레벨 업! Lv.{after.level}</Text>}
          {barnChanged && <Text style={s.barnUp}>곳간이 {barnFor(after.level).name}으로 커졌어요</Text>}
          <View style={s.xpTrack}>
            <Animated.View style={[s.xpFill, { width: bar.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
          </View>
          <Text style={s.xpText}>Lv.{after.level} · 다음 레벨까지 낱알 {after.need - after.into}개</Text>
        </View>

        {wrong.length > 0 && (
          <Pressable onPress={() => setShowWrong(v => !v)} hitSlop={8}>
            <Text style={s.link}>{showWrong ? '틀린 문제 접기' : `틀린 문제 보기 (${wrong.length})`}</Text>
          </Pressable>
        )}
        {showWrong && wrong.map(({ r, q }) => (
          <View key={q.key} style={s.wrongCard}>
            <View style={s.wrongTop}>
              <Text style={s.wrongPrompt}>{q.prompt}</Text>
              <Pressable onPress={() => toggleStar(q.key)} hitSlop={10} accessibilityRole="button"
                accessibilityLabel={save.progress.stats[q.key]?.starred ? '담기 취소' : '담기'}>
                <Text style={s.star}>{save.progress.stats[q.key]?.starred ? '⭐' : '☆'}</Text>
              </Pressable>
            </View>
            <Text style={s.wrongAnswer}>정답: {q.answer}</Text>
            <Text style={s.wrongMine}>{r.timedOut ? '시간 초과' : r.gaveUp ? '모르겠어요' : `내 답: ${r.userAnswer || '(없음)'}`}</Text>
            {q.explain ? <Text style={s.wrongExplain}>{q.explain}</Text> : null}
            {sourceNote(q.source) && <Text style={s.source}>{sourceNote(q.source)}</Text>}
          </View>
        ))}
      </ScrollView>

      {nudges.length > 0 && (
        <View style={s.nudges}>
          {nudges.map(t => <Text key={t} style={s.nudge}>{t}</Text>)}
        </View>
      )}
      <View style={s.actions}>
        <Pressable onPress={() => router.replace({ pathname: '/play', params: { mode: 'normal' } })}
          style={({ pressed }) => [s.primary, pressed && s.pressed]} accessibilityRole="button">
          <Text style={s.primaryText}>다음 판</Text>
        </Pressable>
        <Pressable onPress={() => router.replace('/')} style={({ pressed }) => [s.secondary, pressed && s.pressed]} accessibilityRole="button">
          <Text style={s.secondaryText}>홈</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <View style={s.stat}>
      <Text style={[s.statValue, accent && { color: C.grain }]}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  content: { padding: 20, gap: 18 },
  heading: { fontSize: 26, fontWeight: '800', color: C.ink, textAlign: 'center', marginTop: 12 },
  share: { alignItems: 'center', gap: 10 },
  marks: { fontSize: 30, letterSpacing: 4 },
  shareBtn: { backgroundColor: C.grain, borderRadius: R.button, paddingVertical: 12, paddingHorizontal: 28 },
  shareText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  stats: { flexDirection: 'row', gap: 10 },
  stat: { flex: 1, backgroundColor: C.card, borderRadius: R.card, paddingVertical: 16, alignItems: 'center', borderWidth: 1, borderColor: C.line },
  statValue: { fontSize: 22, fontWeight: '800', color: C.ink },
  statLabel: { fontSize: 12, color: C.sub, marginTop: 4 },
  growth: { alignItems: 'center', gap: 8, paddingVertical: 8 },
  scene: { flexDirection: 'row', alignItems: 'flex-end', gap: 18 },
  levelUp: { fontSize: 20, fontWeight: '800', color: C.accent },
  barnUp: { fontSize: 15, fontWeight: '700', color: C.good },
  xpTrack: { width: '85%', height: 10, borderRadius: 5, backgroundColor: C.line, overflow: 'hidden' },
  xpFill: { height: '100%', backgroundColor: C.grain },
  xpText: { fontSize: 13, color: C.sub },
  link: { fontSize: 15, color: C.accent, fontWeight: '700', textAlign: 'center', padding: 8 },
  wrongCard: { backgroundColor: C.card, borderRadius: R.card, padding: 16, gap: 4, borderWidth: 1, borderColor: C.line },
  wrongTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  wrongPrompt: { flex: 1, fontSize: 15, color: C.ink, fontWeight: '600' },
  star: { fontSize: 20, color: C.grain },
  wrongAnswer: { fontSize: 15, color: C.good, fontWeight: '700' },
  wrongMine: { fontSize: 13, color: C.bad },
  wrongExplain: { fontSize: 13, color: C.sub, lineHeight: 19 },
  source: { fontSize: 11, color: C.faint, textAlign: 'right' },
  nudges: { paddingHorizontal: 20, paddingTop: 8, gap: 2 },
  nudge: { fontSize: 15, color: C.ink, fontWeight: '700', textAlign: 'center' },
  actions: { flexDirection: 'row', gap: 10, padding: 20, paddingTop: 8 },
  primary: { flex: 2, backgroundColor: C.ink, borderRadius: R.card, paddingVertical: 18, alignItems: 'center' },
  primaryText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  secondary: { flex: 1, backgroundColor: C.card, borderRadius: R.card, paddingVertical: 18, alignItems: 'center', borderWidth: 1.5, borderColor: C.line },
  secondaryText: { color: C.ink, fontSize: 18, fontWeight: '700' },
  pressed: { opacity: 0.7 },
});
