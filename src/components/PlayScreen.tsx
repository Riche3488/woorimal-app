// 한 판 화면: 하트·진행·남은 시간, 문제, 답 입력, 정답·해설 보기(맞히면 잠깐, 틀리면 누를 때까지).
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { TYPE_LABELS } from '../core/labels';
import { answer, beginQuestion, canSubmit, giveUp, isOver, remainingMs, startRound, timeout, type Round } from '../core/round';
import { correctInput, wrongInput } from '../core/testmode';
import { timeLimitMs } from '../core/timing';
import type { AnswerInput, AppQuestion } from '../core/types';
import { enterUp } from '../ui/motion';
import { C, paperCard, R, T } from '../ui/theme';
import { ChoiceAnswer, SpacingAnswer, TypedAnswer } from './answers';
import { GrainBurst, Pop, Shake } from './art';
import { GrainIcon, Hearts, SourceNote, TimerBar } from './bits';

export const FEEDBACK_MS = 1200;

type Props = {
  questions: AppQuestion[];
  onFinish(round: Round): void;
  haptics?: boolean;
  testMode?: boolean;
  hearts?: number; // 오늘의 문제는 문제 수만큼 주고 숨겨서 끝까지 풀게 한다
  showHearts?: boolean;
  starred?: (key: string) => boolean; // ⭐ 담기(없으면 별 버튼을 숨긴다)
  onToggleStar?: (key: string) => void;
  onReport?: (q: AppQuestion) => void; // 잘못된 문제 신고(없으면 신고 버튼을 숨긴다)
};

export function PlayScreen({ questions, onFinish, haptics = true, testMode = false, hearts, showHearts = true, starred, onToggleStar, onReport }: Props) {
  const [round, setRound] = useState<Round>(() => startRound(questions, Date.now(), hearts));
  const [phase, setPhase] = useState<'question' | 'feedback'>('question');
  const [now, setNow] = useState(() => Date.now());
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finished = useRef(false);

  const question = round.questions[round.index];
  const last = round.results[round.results.length - 1];
  const shown = phase === 'feedback' ? round.questions[round.index - 1] : question;

  const next = useCallback((settled: Round) => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    advanceTimer.current = null;
    if (isOver(settled)) {
      if (!finished.current) { finished.current = true; onFinish(settled); }
      return;
    }
    setRound(beginQuestion(settled, Date.now()));
    setPhase('question');
  }, [onFinish]);

  // 마감 순간의 탭과 시간 초과, 빠른 두 번 탭이 같은 문제를 두 번 처리하지 않게 한다.
  const settledCount = useRef(0);
  const settle = useCallback((settled: Round) => {
    if (settled.results.length <= settledCount.current) return;
    settledCount.current = settled.results.length;
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    setRound(settled);
    setPhase('feedback');
    const r = settled.results[settled.results.length - 1];
    if (haptics) {
      Haptics.notificationAsync(r.correct ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error).catch(() => {});
    }
    // 틀리면 해설을 읽을 수 있게 자동으로 넘기지 않는다.
    if (r.correct) advanceTimer.current = setTimeout(() => next(settled), FEEDBACK_MS);
  }, [haptics, next]);

  const submit = useCallback((input: AnswerInput) => {
    if (phase !== 'question' || !question || !canSubmit(question, input)) return;
    settle(answer(round, input, Date.now()));
  }, [phase, question, round, settle]);

  const dontKnow = useCallback(() => {
    if (phase !== 'question' || !question) return;
    settle(giveUp(round, Date.now()));
  }, [phase, question, round, settle]);

  // 남은 시간은 실제 시각으로 계산하므로, 앱이 백그라운드에 있다 돌아와도 그만큼 줄어 있다.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 100);
    const sub = AppState.addEventListener('change', st => { if (st === 'active') setNow(Date.now()); });
    return () => { clearInterval(id); sub.remove(); if (advanceTimer.current) clearTimeout(advanceTimer.current); };
  }, []);

  useEffect(() => {
    if (phase === 'question' && question && remainingMs(round, now) === 0) settle(timeout(round, now));
  }, [now, phase, question, round, settle]);

  if (!shown) return null;
  const ratio = phase === 'question' && question ? remainingMs(round, now) / timeLimitMs(question) : 0;

  return (
    <View style={s.screen}>
      <View style={s.top}>
        {showHearts ? <Hearts hearts={round.hearts} /> : <Text style={s.progress}>오늘의 문제</Text>}
        <Text style={s.progress}>{Math.min(round.index + (phase === 'question' ? 1 : 0), round.questions.length)} / {round.questions.length}</Text>
        <Pop trigger={round.grains} style={s.grainBox}>
          <GrainIcon size={20} /><Text style={s.grains}>{round.grains}</Text>
        </Pop>
      </View>
      <TimerBar ratio={ratio} />

      <ScrollView style={s.body} contentContainerStyle={s.bodyContent} keyboardShouldPersistTaps="handled">
        <View style={s.typeRow}>
          <Text style={s.type}>{shown.label ? `${TYPE_LABELS[shown.type]} · ${shown.label}` : TYPE_LABELS[shown.type]}</Text>
          {round.streak >= 3 && phase === 'question' ? <Text style={s.streak}>🔥 {round.streak}연속</Text> : null}
        </View>
        <Animated.View key={`card-${shown.key}`} entering={enterUp(0)} style={s.card}>
          <Text style={s.prompt}>{shown.prompt}</Text>
          <SourceNote source={shown.source} />
        </Animated.View>

        {testMode && phase === 'question' && question ? (
          <View style={s.test}>
            <Text style={s.testText}>테스트 · 정답: {question.answer}</Text>
            <View style={s.testRow}>
              <Pressable style={s.testBtn} onPress={() => submit(correctInput(question))}><Text style={s.testBtnText}>정답 제출</Text></Pressable>
              <Pressable style={s.testBtn} onPress={() => submit(wrongInput(question))}><Text style={s.testBtnText}>오답 제출</Text></Pressable>
              <Pressable style={s.testBtn} onPress={() => settle(timeout(round, Date.now()))}><Text style={s.testBtnText}>시간 초과로 넘기기</Text></Pressable>
            </View>
          </View>
        ) : null}

        {phase === 'question' && question ? (
          <View key={question.key}>
            {question.kind === 'choice' && <ChoiceAnswer choices={question.choices ?? []} onPick={submit} disabled={false} />}
            {question.kind === 'typed' && <TypedAnswer chosung={question.hint?.chosung} onSubmit={submit} disabled={false} />}
            {question.kind === 'spacing' && <SpacingAnswer syllables={question.syllables ?? []} onSubmit={submit} disabled={false} />}
            <Pressable onPress={dontKnow} hitSlop={12} style={s.dontKnow} accessibilityRole="button">
              <Text style={s.dontKnowText}>모르겠어요</Text>
            </Pressable>
          </View>
        ) : last ? (
          <Shake trigger={last.correct ? 0 : round.results.length}>
          <Pressable onPress={() => next(round)} style={[s.feedback, last.correct ? s.good : s.bad]} accessibilityRole="button">
            <GrainBurst trigger={last.correct ? round.results.length : 0} />
            <View style={s.verdictRow}>
              <Text style={[s.verdict, { color: last.correct ? C.good : C.bad }]}>
                {last.correct ? '정답!' : last.timedOut ? '시간 초과' : last.gaveUp ? '모르겠어요' : '아쉬워요'}
              </Text>
              {last.correct && last.grains ? <View style={s.gainBox}><Text style={s.gain}>+{last.grains}</Text><GrainIcon size={18} /></View> : null}
              {onToggleStar ? (
                <Pressable onPress={() => onToggleStar(shown.key)} hitSlop={12} style={s.star} accessibilityRole="button"
                  accessibilityLabel={starred?.(shown.key) ? '담기 취소' : '담기'}>
                  <Text style={s.starText}>{starred?.(shown.key) ? '★' : '☆'}</Text>
                </Pressable>
              ) : null}
            </View>
            {!last.correct && <Text style={s.answerLine}>정답: {shown.answer}</Text>}
            {last.synonymHit && <Text style={s.explain}>비슷한 뜻이지만 여기서 찾는 말은 '{shown.answer}'입니다</Text>}
            {shown.explain ? <Text style={s.explain} numberOfLines={last.correct ? 4 : undefined}>{shown.explain}</Text> : null}
            <Text style={last.correct ? s.tapHint : s.nextHint}>{last.correct ? '눌러서 바로 다음 문제' : '눌러서 다음 문제'}</Text>
            {onReport ? (
              <Pressable onPress={() => onReport(shown)} hitSlop={10} style={s.report} accessibilityRole="link" accessibilityLabel="문제가 이상해요, 신고하기">
                <Text style={s.reportText}>문제가 이상해요</Text>
              </Pressable>
            ) : null}
          </Pressable>
          </Shake>
        ) : null}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg, paddingHorizontal: 18, paddingTop: 12 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  progress: { ...T.num, fontSize: 17, color: C.sub },
  grainBox: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: 10, borderRadius: R.pill, backgroundColor: C.paper, borderWidth: 1, borderColor: C.line },
  grains: { ...T.num, fontSize: 17, color: C.grainDeep },
  body: { flex: 1 },
  bodyContent: { paddingVertical: 18, gap: 16 },
  typeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  type: { flexShrink: 1, fontSize: 13, color: C.accent, fontWeight: '800', letterSpacing: 0.3 },
  streak: { fontSize: 13, color: C.accent, fontWeight: '800', paddingVertical: 3, paddingHorizontal: 9, borderRadius: R.pill, backgroundColor: '#FCEFE7', overflow: 'hidden' },
  card: { ...paperCard, padding: 22 },
  prompt: { fontSize: 20, lineHeight: 31, color: C.ink, fontWeight: '600' },
  feedback: { borderRadius: R.card, padding: 18, gap: 6, borderWidth: 1 },
  good: { backgroundColor: C.goodSoft, borderColor: '#BFDDC6' },
  bad: { backgroundColor: C.badSoft, borderColor: '#EDC1BA' },
  verdictRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  verdict: { ...T.title, fontSize: 24, lineHeight: 32 },
  gainBox: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  gain: { ...T.num, fontSize: 19, color: C.grainDeep },
  dontKnow: { alignSelf: 'center', marginTop: 14, paddingVertical: 6, paddingHorizontal: 12 },
  dontKnowText: { fontSize: 14, color: C.faint, fontWeight: '600', textDecorationLine: 'underline' },
  star: { marginLeft: 'auto', paddingHorizontal: 4 },
  starText: { fontSize: 26, color: C.grain },
  answerLine: { fontSize: 18, color: C.ink, fontWeight: '800' },
  explain: { fontSize: 14, lineHeight: 21, color: C.sub },
  tapHint: { fontSize: 12, color: C.faint, marginTop: 4 },
  nextHint: { fontSize: 15, color: C.ink, fontWeight: '800', marginTop: 8, textAlign: 'center' },
  report: { alignSelf: 'flex-end', paddingVertical: 2 },
  reportText: { fontSize: 12, color: C.faint, textDecorationLine: 'underline' },
  test: { borderWidth: 1, borderStyle: 'dashed', borderColor: C.accent, borderRadius: R.card, padding: 12, gap: 8 },
  testText: { fontSize: 14, color: C.accent, fontWeight: '700' },
  testRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  testBtn: { backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12 },
  testBtnText: { fontSize: 13, color: C.ink, fontWeight: '600' },
});
