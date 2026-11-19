// 홈: 다람쥐·곳간·연속 기록·오늘 목표·도토리, 한 판 시작, 틀린 문제 다시 풀기.
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Barn, Squirrel } from '../components/bits';
import { DAILY_GOAL, todayRounds } from '../core/goals';
import { currentStreak, levelFor, localDay } from '../core/growth';
import { useGame } from '../state/GameProvider';
import { C, R } from '../ui/theme';

export default function Home() {
  const { save, reviewCount } = useGame();
  const lv = levelFor(save.totalGrains);
  const today = localDay(new Date());
  const streak = currentStreak(save.streak, today);
  const done = todayRounds(save.daily, today);
  const freezes = save.streak.freezes ?? 0;

  return (
    <SafeAreaView style={s.screen}>
      <View style={s.header}>
        <Text style={s.title}>우리말 곳간</Text>
        <View style={s.links}>
          <Pressable onPress={() => router.push('/record')} hitSlop={8}><Text style={s.link}>기록</Text></Pressable>
          <Pressable onPress={() => router.push('/settings')} hitSlop={8}><Text style={s.link}>설정</Text></Pressable>
        </View>
      </View>

      <View style={s.hero}>
        <View style={s.scene}>
          <Squirrel level={lv.level} />
          <Barn level={lv.level} />
        </View>
        <Text style={s.level}>다람쥐 Lv.{lv.level}</Text>
        <View style={s.xpTrack}><View style={[s.xpFill, { width: `${(lv.into / lv.need) * 100}%` }]} /></View>
        <Text style={s.xpText}>다음 레벨까지 낱알 {lv.need - lv.into}개 · 모은 낱알 {save.totalGrains}개</Text>
        <Text style={s.streak}>{streak > 0 ? `🔥 ${streak}일 연속` : '오늘 첫 판을 시작해 보세요'}</Text>
        <View style={s.daily} accessibilityLabel={`오늘 목표 ${Math.min(done, DAILY_GOAL)}/${DAILY_GOAL}판`}>
          <Text style={s.dailyLabel}>{done >= DAILY_GOAL ? '오늘 목표 달성' : '오늘'}</Text>
          {Array.from({ length: DAILY_GOAL }, (_, i) => <View key={i} style={[s.dot, i < done && s.dotOn]} />)}
          <Text style={s.dailyLabel}>{Math.min(done, DAILY_GOAL)}/{DAILY_GOAL}판</Text>
          {freezes > 0 && <Text style={s.acorn} accessibilityLabel={`도토리 ${freezes}개`}>🌰 {freezes}</Text>}
        </View>
      </View>

      <View style={s.actions}>
        <Pressable onPress={() => router.push({ pathname: '/play', params: { mode: 'normal' } })}
          style={({ pressed }) => [s.primary, pressed && s.pressed]} accessibilityRole="button">
          <Text style={s.primaryText}>▶ 한 판 시작</Text>
          <Text style={s.primarySub}>10문제 · 하트 3개</Text>
        </Pressable>
        <Pressable disabled={reviewCount === 0} onPress={() => router.push({ pathname: '/play', params: { mode: 'review' } })}
          style={({ pressed }) => [s.secondary, reviewCount === 0 && s.disabled, pressed && s.pressed]} accessibilityRole="button">
          <Text style={s.secondaryText}>틀린 문제 다시 풀기 ({reviewCount})</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg, paddingHorizontal: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  title: { fontSize: 22, fontWeight: '800', color: C.ink },
  links: { flexDirection: 'row', gap: 18 },
  link: { fontSize: 15, color: C.sub, fontWeight: '600' },
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  scene: { flexDirection: 'row', alignItems: 'flex-end', gap: 18, marginBottom: 8 },
  level: { fontSize: 20, fontWeight: '800', color: C.ink },
  xpTrack: { width: '80%', height: 10, borderRadius: 5, backgroundColor: C.line, overflow: 'hidden' },
  xpFill: { height: '100%', backgroundColor: C.grain },
  xpText: { fontSize: 13, color: C.sub },
  streak: { fontSize: 16, color: C.accent, fontWeight: '700', marginTop: 6 },
  daily: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  dailyLabel: { fontSize: 14, color: C.sub, fontWeight: '600' },
  dot: { width: 12, height: 12, borderRadius: 6, borderWidth: 1.5, borderColor: C.grain },
  dotOn: { backgroundColor: C.grain },
  acorn: { fontSize: 14, color: C.sub, fontWeight: '700', marginLeft: 8 },
  actions: { gap: 12, paddingBottom: 24 },
  primary: { backgroundColor: C.ink, borderRadius: R.card, paddingVertical: 20, alignItems: 'center' },
  primaryText: { color: '#fff', fontSize: 20, fontWeight: '800' },
  primarySub: { color: C.grainSoft, fontSize: 13, marginTop: 4 },
  secondary: { backgroundColor: C.card, borderRadius: R.card, paddingVertical: 16, alignItems: 'center', borderWidth: 1.5, borderColor: C.line },
  secondaryText: { color: C.ink, fontSize: 16, fontWeight: '700' },
  disabled: { opacity: 0.4 },
  pressed: { opacity: 0.7, transform: [{ scale: 0.99 }] },
});
