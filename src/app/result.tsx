// 결과: 정답 수·정답률·얻은 낱알, 경험치 바, 레벨업·곳간 변화 연출, 다음 목표·외운 문제 안내, 틀린 문제 보기(⭐ 담기).
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LevelUpScene, Pop, PressableScale } from '../components/art';
import { Barn, Float, GrainIcon, Squirrel, type SquirrelPose } from '../components/bits';
import { challengeNumber, marksToEmoji, shareText } from '../core/challenge';
import { resultNudges, todayRounds } from '../core/goals';
import { barnFor, currentStreak, freezesUsed, levelFor, localDay } from '../core/growth';
import { sourceNote, TYPE_LABELS } from '../core/labels';
import { newlyMastered } from '../core/progress';
import { useGame } from '../state/GameProvider';
import { resultAction } from '../core/result-actions';
import { dailyProgress } from '../core/activity';
import { addDays } from '../core/growth';
import { DECORATION_IDS, DECORATIONS, RARITY_LABEL, newDecorations } from '../core/decorations';
import { Image } from 'expo-image';
import { ART } from '../../assets/art';
import { DUR, EASE, enterUp } from '../ui/motion';
import { goHome } from '../ui/navigation';
import { C, elevation, paperCard, R, T } from '../ui/theme';
export default function Result() {
  const game = useGame();
  const {
    lastRound,
    lastMode,
    lastPracticeType,
    previousSave,
    save,
    toggleStar
  } = game;
  const [showWrong, setShowWrong] = useState(false);
  // 도감에서 확인하기 전까지는 새 장식으로 보인다(결과 화면만 봐서는 확인한 것으로 치지 않는다).
  const freshDecos = newDecorations(save);
  const outcome = save.lastOutcome;
  const beforeGrains = outcome?.beforeGrains ?? previousSave?.totalGrains ?? 0;
  const afterGrains = outcome?.afterGrains ?? save.totalGrains;
  const before = levelFor(beforeGrains);
  const after = levelFor(afterGrains);
  const leveledUp = after.level > before.level;
  const barnChanged = barnFor(after.level).name !== barnFor(before.level).name;

  // 경험치 바: 이전 값에서 새 값으로(레벨업이면 0에서) 채운다.
  const reduce = useReducedMotion();
  const target = after.into / after.need;
  const bar = useSharedValue(reduce ? target : leveledUp ? 0 : before.into / before.need);
  useEffect(() => {
    bar.value = reduce ? target : withDelay(DUR.slow, withTiming(target, {
      duration: 900,
      easing: EASE.out
    }));
  }, [bar, reduce, target]);
  const barStyle = useAnimatedStyle(() => ({
    width: `${Math.max(0.02, bar.value) * 100}%`
  }));
  if (!lastRound) {
    return <SafeAreaView style={s.screen}><Pressable onPress={goHome}><Text style={s.link}>홈으로</Text></Pressable></SafeAreaView>;
  }
  const total = lastRound.results.length;
  const correct = lastRound.results.filter(r => r.correct).length;
  const today = game.today ?? localDay(new Date());
  const context = save.lastOutcome?.session.context ?? {
    mode: lastMode,
    practiceType: lastPracticeType ?? undefined,
    day: today,
    packVersion: game.pack.version,
    rulesVersion: 'legacy-v1'
  };
  const action = resultAction(context, game.counts);
  const daily = dailyProgress(save.activity, today);
  const tomorrow = Object.values(save.progress.stats).filter(s => s.box > 0 && s.dueDay === addDays(today, 1)).length;
  const used = previousSave ? freezesUsed(previousSave.streak, today) : 0;
  const nudges = resultNudges({
    beforeGrains,
    afterGrains,
    roundGrains: lastRound.grains,
    todayRounds: todayRounds(save.daily, today),
    freezesUsed: used,
    freezeEarned: (save.streak.freezes ?? 0) > (previousSave?.streak.freezes ?? 0) - used,
    mastered: save.lastOutcome?.mastered ?? (previousSave ? newlyMastered(previousSave.progress, save.progress) : 0),
    learnedToday: daily.learned,
    goalComplete: daily.complete,
    includeGoal: false
  });
  const share = () => {
    Share.share({
      message: shareText({
        day: context.day,
        marks: save.challengeHistory[context.day] ?? save.challenge.marks,
        streak: currentStreak(save.streak, today)
      })
    }).catch(() => {});
  };
  const rate = total ? correct / total : 0;
  const pose: SquirrelPose = rate >= 0.8 ? 'cheer' : rate < 0.4 ? 'think' : 'idle';
  const wrong = lastRound.results.map((r, i) => ({
    r,
    q: lastRound.questions[i]
  })).filter(x => !x.r.correct);
  return <SafeAreaView style={s.screen}>
      <ScrollView contentContainerStyle={s.content}>
        <Animated.Text entering={enterUp(0)} style={s.heading}>
          {lastMode === 'challenge' ? `오늘의 문제 #${challengeNumber(context.day)}` : lastRound.hearts === 0 ? '하트를 다 썼어요' : lastMode === 'review' ? '복습 끝!' : lastMode === 'practice' && lastPracticeType ? `${TYPE_LABELS[lastPracticeType]} 연습 끝!` : '한 판 끝!'}
        </Animated.Text>
        {lastMode === 'challenge' && <View style={s.share}>
            <Text style={s.marks} accessibilityLabel="오늘의 문제 결과">{marksToEmoji(save.challengeHistory[context.day] ?? save.challenge.marks)}</Text>
          </View>}

        <Animated.View entering={enterUp(1)} style={s.stats}>
          <Stat label="정답" value={`${correct} / ${total}`} />
          <Stat label="정답률" value={`${total ? Math.round(correct / total * 100) : 0}%`} />
          <Stat label="낱알" value={`+${lastRound.grains}`} accent />
        </Animated.View>

        <Animated.View entering={enterUp(2)} style={s.growth}>
          {leveledUp ? <View style={s.levelCard} accessible accessibilityLabel={`다람쥐 ${after.level}레벨`}>
              <LevelUpScene style={StyleSheet.absoluteFill} />
            </View> : <View style={s.stage}>
              <Float><Squirrel level={after.level} pose={pose} size={1.15} /></Float>
              <Barn level={after.level} size={1.05} />
            </View>}
          {leveledUp && <Pop trigger={after.level}><Text style={s.levelUp}>레벨 업! Lv.{after.level}</Text></Pop>}
          {barnChanged && <View style={s.barnUpRow}>
              <Barn level={after.level} size={0.5} showName={false} />
              <Text style={s.barnUp}>곳간이 {barnFor(after.level).name}으로 커졌어요</Text>
            </View>}
          <View style={s.xpTrack}>
            <Animated.View style={[s.xpFill, barStyle]}><View style={s.xpShine} /></Animated.View>
          </View>
          <Text style={s.xpText}>Lv.{after.level} · 다음 레벨까지 낱알 {after.need - after.into}개</Text>
        </Animated.View>

        <View style={s.wrongCard}><Text style={s.wrongPrompt}>{daily.complete ? '오늘 목표 달성! 내일 또 만나요' : `오늘 학습 ${daily.learned}/5개`}</Text><Text style={{
          color: C.sub
        }}>내일 복습 {tomorrow}개</Text>
        </View>
        {freshDecos.length > 0 && <Pop trigger={freshDecos.join()}>
            <Pressable accessibilityRole="button" accessibilityLabel={`새 장식을 얻었어요: ${freshDecos.map(id => DECORATIONS[id].name).join(', ')}. 눌러서 곳간 꾸미기`} onPress={() => router.push('/collection')} style={s.decoCard}>
              <View style={s.decoThumbs}>{freshDecos.slice(0, 3).map(id => <Image key={id} source={ART.decoration[id]} style={s.decoThumb} contentFit="contain" accessible={false} />)}</View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={s.decoTitle}>새 장식을 얻었어요!</Text>
                <Text style={s.decoNames}>{freshDecos.map(id => `${DECORATIONS[id].name}(${RARITY_LABEL[DECORATIONS[id].rarity]})`).join(' · ')}</Text>
                <Text style={s.link}>곳간에 놓으러 가기 ›</Text>
              </View>
            </Pressable>
          </Pop>}
        {freshDecos.length === 0 && save.decorations.unlocked.length > 0 && <Pressable accessibilityRole="button" onPress={() => router.push('/collection')} hitSlop={8}>
            <Text style={s.link}>곳간 꾸미기 · 장식 {save.decorations.unlocked.length}/{DECORATION_IDS.length}</Text>
          </Pressable>}
        {wrong.length > 0 && <Pressable onPress={() => setShowWrong(v => !v)} hitSlop={8}>
            <Text style={s.link}>{showWrong ? '틀린 문제 접기' : `틀린 문제 보기 (${wrong.length})`}</Text>
          </Pressable>}
        {showWrong && wrong.map(({
        r,
        q
      }) => <View key={q.key} style={s.wrongCard}>
            <View style={s.wrongTop}>
              <Text style={s.wrongPrompt}>{q.prompt}</Text>
              <Pressable onPress={() => toggleStar(q.key)} hitSlop={10} accessibilityRole="button" accessibilityLabel={save.progress.stats[q.key]?.starred ? '담기 취소' : '담기'}>
                <Text style={s.star}>{save.progress.stats[q.key]?.starred ? '★' : '☆'}</Text>
              </Pressable>
            </View>
            <Text style={s.wrongAnswer}>정답: {q.answer}</Text>
            <Text style={s.wrongMine}>{r.timedOut ? '시간 초과' : r.gaveUp ? '모르겠어요' : `내 답: ${r.userAnswer || '(없음)'}`}</Text>
            {q.explain ? <Text style={s.wrongExplain}>{q.explain}</Text> : null}
            {sourceNote(q.source) && <Text style={s.source}>{sourceNote(q.source)}</Text>}
          </View>)}
      </ScrollView>

      {nudges.length > 0 && <View style={s.nudges}>
          {nudges.map(t => <Text key={t} style={s.nudge}>{t}</Text>)}
        </View>}
      <View style={s.actions}>
        <PressableScale onPress={() => action.target === 'share' ? share() : action.target === 'home' ? goHome() : router.replace({
        pathname: '/play',
        params: {
          mode: action.mode,
          type: action.practiceType
        }
      })} haptic={save.settings.haptics} style={s.primary} accessibilityRole="button">
          <Text style={s.primaryText}>{action.label}</Text>
        </PressableScale>
        <PressableScale onPress={goHome} style={s.secondary} accessibilityRole="button">
          <Text style={s.secondaryText}>홈</Text>
        </PressableScale>
      </View>
    </SafeAreaView>;
}
function Stat({
  label,
  value,
  accent
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return <View style={s.stat}>
      <View style={s.statRow}>
        <Text style={[s.statValue, accent && {
        color: C.grainDeep
      }]}>{value}</Text>
        {accent ? <GrainIcon size={18} /> : null}
      </View>
      <Text style={s.statLabel}>{label}</Text>
    </View>;
}
const s = StyleSheet.create({
  decoCard: {
    ...paperCard,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderColor: C.grain,
    borderWidth: 2
  },
  decoThumbs: {
    flexDirection: 'row'
  },
  decoThumb: {
    width: 52,
    height: 52,
    marginRight: -10
  },
  decoTitle: {
    ...T.heading,
    color: C.accent
  },
  decoNames: {
    fontSize: 13,
    color: C.ink,
    lineHeight: 19
  },
  screen: {
    flex: 1,
    backgroundColor: C.bg
  },
  content: {
    padding: 20,
    gap: 18
  },
  heading: {
    ...T.display,
    textAlign: 'center',
    marginTop: 10
  },
  share: {
    alignItems: 'center',
    gap: 10
  },
  marks: {
    fontSize: 30,
    letterSpacing: 4
  },
  shareBtn: {
    backgroundColor: C.grain,
    borderRadius: R.button,
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderBottomWidth: 3,
    borderBottomColor: C.grainDeep
  },
  shareText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800'
  },
  stats: {
    flexDirection: 'row',
    gap: 10
  },
  stat: {
    ...paperCard,
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center'
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2
  },
  statValue: {
    ...T.num,
    fontSize: 24,
    lineHeight: 32
  },
  statLabel: {
    fontSize: 12,
    color: C.sub,
    marginTop: 2,
    fontWeight: '600'
  },
  growth: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4
  },
  levelCard: {
    width: '100%',
    aspectRatio: 1.25,
    borderRadius: 26,
    overflow: 'hidden',
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.line,
    ...elevation(2)
  },
  stage: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 6,
    paddingTop: 14,
    paddingBottom: 18,
    borderRadius: 26,
    backgroundColor: '#F7EEDC',
    borderWidth: 1,
    borderColor: C.line
  },
  levelUp: {
    ...T.title,
    fontSize: 26,
    lineHeight: 34,
    color: C.accent
  },
  barnUpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  barnUp: {
    fontSize: 15,
    fontWeight: '800',
    color: C.good
  },
  xpTrack: {
    width: '90%',
    height: 12,
    borderRadius: 6,
    backgroundColor: C.line,
    overflow: 'hidden'
  },
  xpFill: {
    height: '100%',
    borderRadius: 6,
    backgroundColor: C.grain,
    overflow: 'hidden'
  },
  xpShine: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 4,
    backgroundColor: C.grainLight,
    opacity: 0.8
  },
  xpText: {
    fontSize: 13,
    color: C.sub,
    fontWeight: '600'
  },
  link: {
    fontSize: 15,
    color: C.accent,
    fontWeight: '800',
    textAlign: 'center',
    padding: 8
  },
  wrongCard: {
    ...paperCard,
    padding: 16,
    gap: 4
  },
  wrongTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8
  },
  wrongPrompt: {
    flex: 1,
    fontSize: 15,
    color: C.ink,
    fontWeight: '600',
    lineHeight: 22
  },
  star: {
    fontSize: 22,
    color: C.grain
  },
  wrongAnswer: {
    fontSize: 15,
    color: C.good,
    fontWeight: '800'
  },
  wrongMine: {
    fontSize: 13,
    color: C.bad
  },
  wrongExplain: {
    fontSize: 13,
    color: C.sub,
    lineHeight: 19
  },
  source: {
    fontSize: 11,
    color: C.faint,
    textAlign: 'right'
  },
  nudges: {
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 2
  },
  nudge: {
    fontSize: 15,
    color: C.ink,
    fontWeight: '700',
    textAlign: 'center'
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    padding: 20,
    paddingTop: 10
  },
  primary: {
    flex: 2,
    backgroundColor: C.ink,
    borderRadius: R.card,
    paddingVertical: 18,
    alignItems: 'center',
    borderBottomWidth: 4,
    borderBottomColor: '#120D09',
    ...elevation(2)
  },
  primaryText: {
    fontFamily: T.num.fontFamily,
    color: C.grainLight,
    fontSize: 21,
    lineHeight: 28
  },
  secondary: {
    ...paperCard,
    flex: 1,
    paddingVertical: 18,
    alignItems: 'center'
  },
  secondaryText: {
    color: C.ink,
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 28
  },
  pressed: {
    opacity: 0.7
  }
});
