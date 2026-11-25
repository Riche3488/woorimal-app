// 홈: 곳간 디오라마(단계별 영상)·다람쥐 레벨·연속 기록·오늘 목표·도토리, 한 판 시작, 오답노트.
import { router } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { Alert, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
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
import { dailyProgress } from '../core/activity';
import { addDays } from '../core/growth';
import { pickQuickRound } from '../core/quick-play';
import { emptyProgress } from '../core/progress';
import { seededRng } from '../core/challenge';
import { DailyMission } from '../components/DailyMission';
import { BarnDecorations } from '../components/BarnDecorations';
import { DECORATION_IDS, newDecorations } from '../core/decorations';
export default function Home() {
  const game = useGame();
  const {
    pack,
    save,
    counts
  } = game;
  const lv = levelFor(save.totalGrains);
  const newDecos = newDecorations(save).length;
  const today = game.today ?? localDay(new Date());
  const streak = currentStreak(save.streak, today);
  const daily = dailyProgress(save.activity, today),
    done = daily.milestones;
  const quickCount = useMemo(() => pickQuickRound(pack.questions, emptyProgress(), {
    now: Date.now(),
    rng: seededRng('availability')
  }).length, [pack.questions]);
  const tomorrow = Object.values(save.progress.stats).filter(s => s.box > 0 && s.dueDay === addDays(today, 1)).length;
  const freezes = save.streak.freezes ?? 0;
  const challengeDone = save.challenge.day === today;
  const card = cardOfDay(pack.cards, today);
  const cardDone = save.card.day === today;
  const haptic = save.settings.haptics;
  const openChallenge = () => {
    if (!challengeDone) router.push({
      pathname: '/play',
      params: {
        mode: 'challenge'
      }
    });else Share.share({
      message: shareText({
        day: today,
        marks: save.challenge.marks,
        streak
      })
    }).catch(() => {});
  };
  return <SafeAreaView style={s.screen}>
      {/* 화면이 낮으면(폴더블 바깥 화면·큰 글꼴) 아래 버튼이 내비게이션 바에 가리지 않게 스크롤한다. */}
      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.header}>
          <Text style={s.title}>우리말 곳간</Text>
          <View style={s.links}>
            <Pressable onPress={() => router.push('/record')} hitSlop={8} style={s.link}><Text style={s.linkText}>기록</Text></Pressable>
            <Pressable onPress={() => router.push('/settings')} hitSlop={8} style={s.link}><Text style={s.linkText}>설정</Text></Pressable>
          </View>
        </View>

        <Animated.View entering={enterUp(0)} style={s.diorama}>
          <HeroScene stage={barnStage(lv.level)} style={StyleSheet.absoluteFill} />
          <BarnDecorations slots={save.decorations.equipped} />
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
              <Text style={[s.chipText, streak > 0 && {
              color: C.accent
            }]}>{streak > 0 ? `🔥 ${streak}일 연속` : '오늘 첫 판을 시작해 보세요'}</Text>
            </View>
            <View style={s.chip} accessibilityLabel={daily.complete?'오늘 목표 달성':`오늘 목표 ${Math.min(daily.learned, 5)}/5개`}>
              {Array.from({
              length: DAILY_GOAL
            }, (_, i) => <View key={i} style={{
              opacity: i < done ? 1 : 0.22
            }}><GrainIcon size={16} /></View>)}
              <Text style={s.chipText}>{daily.complete ? '오늘 목표 달성' : `오늘 ${Math.min(daily.learned, 5)}/5개`}</Text>
            </View>
            {freezes > 0 && <View style={s.chip} accessibilityLabel={`도토리 ${freezes}개`}>
                <AcornIcon size={16} /><Text style={s.chipText}>{freezes}</Text>
              </View>}
          </View>
          <Text style={s.total}>모은 낱알 {save.totalGrains.toLocaleString()}개</Text>
        </Animated.View>

        <View style={s.actions}>
          {save.activeSession && <View style={s.wordRow}>
            <Pressable accessibilityRole="button" onPress={() => router.push({
            pathname: '/play',
            params: {
              mode: 'resume'
            }
          })} style={{
            flex: 1,
            paddingVertical: 12
          }}><Text style={s.wordText}>이어 하기 · {save.activeSession.round.index}/{save.activeSession.round.questions.length}</Text></Pressable>
            <Pressable accessibilityRole="button" onPress={() => Alert.alert('이 판을 끝낼까요?', '푼 문제 기록은 남고, 완료하지 않은 판의 낱알은 받지 않아요.', [{
            text: '취소',
            style: 'cancel'
          }, {
            text: '이 판 끝내기',
            onPress: () => {
              void game.sessions?.discard(save.activeSession!.id).catch(() => {});
            }
          }])}><Text style={s.secondarySub}>이 판 끝내기</Text></Pressable>
          </View>}
          {!save.activeSession && save.lastOutcome && <Pressable accessibilityRole="button" onPress={() => router.push('/result')}><Text style={s.secondarySub}>최근 결과 보기</Text></Pressable>}
          <DailyMission progress={daily} due={counts.due} tomorrow={tomorrow} quickCount={quickCount} onStart={() => router.push({
          pathname: '/play',
          params: {
            mode: save.activeSession ? 'resume' : counts.due ? 'review' : quickCount ? 'quick' : 'normal',
            ...(counts.due ? {
              count: String(Math.min(3, counts.due))
            } : {})
          }
        })} />
          <Pressable accessibilityRole="button" accessibilityLabel={`곳간 꾸미기 · 낱말 도감, 장식 ${save.decorations.unlocked.length}/${DECORATION_IDS.length}${newDecos > 0 ? `, 새 장식 ${newDecos}개` : ''}`} style={s.wordRow} onPress={() => router.push('/collection')}><Text style={s.wordText}>곳간 꾸미기 · 낱말 도감</Text><Text style={s.decoCount}>장식 {save.decorations.unlocked.length}/{DECORATION_IDS.length}</Text>{newDecos > 0 && <View style={s.newPill}><Text style={s.newPillText}>NEW {newDecos}</Text></View>}</Pressable>
          <Animated.View entering={enterUp(2)}>
            <PressableScale onPress={openChallenge} haptic={haptic} style={s.challenge} accessibilityRole="button">
              <View style={s.seal}><Text style={s.sealText} maxFontSizeMultiplier={1.2}>오늘</Text></View>
              <View style={{
              flex: 1
            }}>
                <Text style={s.challengeTitle}>오늘의 문제 #{challengeNumber(today)}</Text>
                <Text style={s.challengeSub}>
                  {challengeDone ? `${marksToEmoji(save.challenge.marks)} ${markScore(save.challenge.marks)}/${save.challenge.marks.length} · 공유하기` : `모두에게 같은 ${CHALLENGE_SIZE}문제 · 하루 한 번`}
                </Text>
              </View>
              <Text style={s.chev}>›</Text>
            </PressableScale>
          </Animated.View>
          {card ? <Animated.View entering={enterUp(2)}>
              <Pressable onPress={() => router.push('/card')} style={s.wordRow} accessibilityRole="button" accessibilityLabel={`오늘의 낱말 ${card.word}${cardDone ? ', 풀었어요' : ''}`}>
                <Text style={s.wordLabel} maxFontSizeMultiplier={1.4}>오늘의 낱말</Text>
                <Text style={s.wordText} numberOfLines={1}>{card.word}</Text>
                <Text style={[s.wordState, cardDone && {
              color: C.good
            }]} maxFontSizeMultiplier={1.4}>{cardDone ? '✓ 풀었어요' : '읽고 풀기 ›'}</Text>
              </Pressable>
            </Animated.View> : null}
          <Animated.View entering={enterUp(3)}>
            <View style={{
            flexDirection: 'row',
            gap: 12,
            marginBottom: 10
          }}>{[{
              on: true,
              label: '보기로 풀기'
            }, {
              on: false,
              label: '직접 입력'
            }].map(option => <Pressable key={option.label} accessibilityRole="radio" accessibilityState={{
              checked: save.settings.choiceMode === option.on
            }} onPress={() => game.updateSettings({
              choiceMode: option.on
            })} style={{
              padding: 12,
              borderRadius: 12,
              backgroundColor: save.settings.choiceMode === option.on ? C.grainSoft : C.paper
            }}><Text style={{
                color: C.ink
              }}>{option.label}</Text></Pressable>)}</View>
            <PressableScale onPress={() => router.push({
            pathname: '/play',
            params: {
              mode: 'normal'
            }
          })} haptic={haptic} style={s.primary} accessibilityRole="button">
              <Text style={s.primaryText}>한 판 시작</Text>
              <Text style={s.primarySub}>10문제 · 하트 3개</Text>
            </PressableScale>
          </Animated.View>
          {quickCount>0&&daily.complete&&<Pressable accessibilityRole="button" onPress={()=>router.push({pathname:'/play',params:{mode:save.activeSession?'resume':'quick'}})} style={s.wordRow}><Text style={s.wordText}>다른 학습 · 가볍게 {quickCount}문제</Text><Text style={s.secondarySub}>시간제한 없음</Text></Pressable>}
          <Animated.View entering={enterUp(4)} style={s.pair}>
            <PressableScale onPress={() => router.push('/notebook')} style={[s.secondary, {
            flex: 1
          }]} accessibilityRole="button">
              <Text style={s.secondaryText}>오답노트</Text>
              {counts.due > 0 ? <View style={s.dueBadge}><Text style={s.dueText}>오늘 복습 {counts.due}</Text></View> : <Text style={s.secondarySub}>오늘 복습 {counts.due}</Text>}
            </PressableScale>
            {/* 묶음에 주제 퍼즐이 없어도 조합 퍼즐은 만들 수 있으므로 늘 보인다. */}
            <PressableScale onPress={() => router.push('/puzzles')} style={[s.secondary, {
            flex: 1
          }]} accessibilityRole="button">
              <Text style={s.secondaryText}>가로세로 퍼즐</Text>
            </PressableScale>
          </Animated.View>
        </View>
      </ScrollView>
    </SafeAreaView>;
}

// 경험치 바: 처음 열 때 0에서 채워진다.
function XpBar({
  ratio
}: {
  ratio: number;
}) {
  const reduce = useReducedMotion();
  const w = useSharedValue(reduce ? ratio : 0);
  useEffect(() => {
    w.value = reduce ? ratio : withDelay(DUR.base, withTiming(ratio, {
      duration: DUR.slow * 2,
      easing: EASE.out
    }));
  }, [ratio, reduce, w]);
  const st = useAnimatedStyle(() => ({
    width: `${Math.max(0.02, w.value) * 100}%`
  }));
  return <View style={s.xpTrack}>
      <Animated.View style={[s.xpFill, st]}><View style={s.xpShine} /></Animated.View>
    </View>;
}
const s = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: C.bg
  },
  scroll: {
    flex: 1
  },
  // flexGrow: 화면이 넉넉하면 곳간 그림이 남는 높이를 채우고, 모자라면 스크롤된다.
  content: {
    flexGrow: 1,
    paddingHorizontal: 18
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 10
  },
  title: {
    ...T.title,
    fontSize: 24
  },
  links: {
    flexDirection: 'row',
    gap: 8
  },
  link: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: R.pill,
    backgroundColor: C.paper,
    borderWidth: 1,
    borderColor: C.line
  },
  linkText: {
    fontSize: 14,
    color: C.sub,
    fontWeight: '700'
  },
  diorama: {
    flex: 1,
    minHeight: 200,
    maxHeight: 400,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: C.grainSoft,
    borderWidth: 1,
    borderColor: C.line,
    ...elevation(2)
  },
  badge: {
    position: 'absolute',
    left: 14,
    top: 14,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: R.pill,
    backgroundColor: 'rgba(255,253,248,0.9)'
  },
  badgeLv: {
    ...T.num,
    fontSize: 18,
    color: C.accent
  },
  badgeBarn: {
    fontSize: 12,
    color: C.sub,
    fontWeight: '700'
  },
  status: {
    paddingTop: 16,
    paddingBottom: 6,
    gap: 8
  },
  // 큰 글꼴에서는 '다음 레벨까지'가 다음 줄로 내려간다.
  levelRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 8,
    justifyContent: 'space-between',
    alignItems: 'baseline'
  },
  level: {
    ...T.title,
    fontSize: 21
  },
  xpText: {
    fontSize: 13,
    color: C.sub,
    fontWeight: '600'
  },
  xpTrack: {
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
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: R.pill,
    backgroundColor: C.paper,
    borderWidth: 1,
    borderColor: C.line
  },
  chipHot: {
    borderColor: '#EBC3AE',
    backgroundColor: '#FCEFE7'
  },
  chipText: {
    fontSize: 13,
    color: C.sub,
    fontWeight: '700',
    marginLeft: 2
  },
  total: {
    fontSize: 12,
    color: C.faint
  },
  actions: {
    gap: 10,
    paddingTop: 8,
    paddingBottom: 16
  },
  challenge: {
    ...paperCard,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderColor: C.grain,
    borderWidth: 1.5,
    backgroundColor: '#FFF8E8'
  },
  seal: {
    width: 42,
    height: 42,
    borderRadius: 8,
    backgroundColor: C.accent,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{
      rotate: '-4deg'
    }]
  },
  sealText: {
    fontFamily: T.num.fontFamily,
    color: '#FFF4E6',
    fontSize: 14
  },
  challengeTitle: {
    ...T.heading,
    fontSize: 17
  },
  challengeSub: {
    color: C.sub,
    fontSize: 13,
    marginTop: 3,
    fontWeight: '600'
  },
  chev: {
    fontSize: 26,
    color: C.grain,
    fontWeight: '300'
  },
  decoCount: {
    marginLeft: 'auto',
    fontSize: 13,
    color: C.sub,
    fontWeight: '700'
  },
  newPill: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: R.pill,
    backgroundColor: C.accent
  },
  newPillText: {
    fontSize: 11,
    color: C.paper,
    fontWeight: '800'
  },
  wordRow: {
    ...paperCard,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14
  },
  wordLabel: {
    fontSize: 12,
    color: C.accent,
    fontWeight: '800'
  },
  wordText: {
    flex: 1,
    fontFamily: T.num.fontFamily,
    fontSize: 18,
    color: C.ink
  },
  wordState: {
    fontSize: 13,
    color: C.sub,
    fontWeight: '700'
  },
  primary: {
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
    fontSize: 23,
    lineHeight: 30
  },
  primarySub: {
    color: '#D9CBB4',
    fontSize: 13,
    marginTop: 2,
    fontWeight: '600'
  },
  pair: {
    flexDirection: 'row',
    gap: 10
  },
  secondary: {
    ...paperCard,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 15
  },
  secondaryText: {
    color: C.ink,
    fontSize: 16,
    fontWeight: '800'
  },
  secondarySub: {
    color: C.faint,
    fontSize: 13,
    fontWeight: '600'
  },
  dueBadge: {
    backgroundColor: C.accent,
    borderRadius: R.pill,
    paddingVertical: 3,
    paddingHorizontal: 9
  },
  dueText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800'
  }
});
