// 오늘의 낱말: 웹 자체 학습 낱말 카드(뜻·쓰임 설명·팁·예문)를 읽고, 아래에서 쓰임 문제 하나를 바로 푼다.
// 보기마다 이유를 보여 준다. 틀리면 오답노트에 들어간다. 판·낱알·하루 목표에는 세지 않는다.
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { cardOfDay, cardQuestion } from '../core/cards';
import { gradeItem } from '../core/grading';
import { localDay } from '../core/growth';
import { useGame } from '../state/GameProvider';
import { enterUp } from '../ui/motion';
import { C, paperCard, R, T } from '../ui/theme';

// 쓰임 문제 해설은 "보기 문장: 이유" 줄로 되어 있다.
function reasonFor(explain: string, choice: string): string {
  const line = explain.split('\n').find(l => l.startsWith(`${choice}: `));
  return line ? line.slice(choice.length + 2) : '';
}

export default function CardScreen() {
  const { pack, save, answerCard } = useGame();
  const today = localDay(new Date());
  const card = cardOfDay(pack.cards, today);
  const question = card ? cardQuestion(card, pack.questions) : null;
  const doneBefore = save.card.day === today;
  const [picked, setPicked] = useState<string | null>(null);
  const revealed = picked !== null || doneBefore;

  const pick = (choice: string) => {
    if (!question || revealed) return;
    setPicked(choice);
    answerCard({
      key: question.key, type: question.type, correct: gradeItem(question, choice), timedOut: false, gaveUp: false,
      synonymHit: false, userAnswer: choice, elapsedMs: 0, grains: 0,
    });
  };

  return (
    <SafeAreaView style={s.screen}>
      <View style={s.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}><Text style={s.back}>‹ 뒤로</Text></Pressable>
        <Text style={s.title}>오늘의 낱말</Text>
        <View style={{ width: 48 }} />
      </View>
      {!card ? (
        <View style={s.empty}><Text style={s.emptyText}>오늘의 낱말을 준비하고 있어요</Text></View>
      ) : (
        <ScrollView contentContainerStyle={s.content}>
          <Animated.View entering={enterUp(0)} style={s.card}>
            <View style={s.wordRow}>
              <Text style={s.word}>{card.word}</Text>
              {card.pos ? <Text style={s.pos}>{card.pos}</Text> : null}
            </View>
            <Text style={s.meaning}>{card.meaning}</Text>
            {card.explain ? <Text style={s.body}>{card.explain}</Text> : null}
            <View style={s.examples}>
              {card.examples.map(ex => <Text key={ex} style={s.example}>“{ex}”</Text>)}
            </View>
            {card.tip ? <Text style={s.tip}>💡 {card.tip}</Text> : null}
          </Animated.View>

          {question ? (
            <Animated.View entering={enterUp(1)} style={s.quiz}>
              <Text style={s.quizLabel}>확인 문제</Text>
              <Text style={s.prompt}>{question.prompt}</Text>
              {(question.choices ?? []).map(choice => {
                const right = choice === question.answer;
                const mine = choice === picked;
                return (
                  <Pressable key={choice} onPress={() => pick(choice)} disabled={revealed} accessibilityRole="button"
                    style={[s.choice, revealed && right && s.choiceRight, revealed && mine && !right && s.choiceWrong]}>
                    <Text style={s.choiceText}>{revealed && right ? '✓ ' : revealed && mine ? '✗ ' : ''}{choice}</Text>
                    {revealed && reasonFor(question.explain, choice) ? <Text style={s.reason}>{reasonFor(question.explain, choice)}</Text> : null}
                  </Pressable>
                );
              })}
              {picked !== null ? (
                <Text style={[s.verdict, { color: picked === question.answer ? C.good : C.bad }]}>
                  {picked === question.answer ? '정답! 내일 또 새 낱말이 와요' : '오답노트에 담았어요. 내일 다시 풀어 봐요'}
                </Text>
              ) : doneBefore ? <Text style={s.doneText}>오늘 낱말은 이미 풀었어요</Text> : null}
            </Animated.View>
          ) : null}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12 },
  back: { fontSize: 16, color: C.sub, fontWeight: '700', width: 48 },
  title: { ...T.title, fontSize: 20 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: C.sub, fontSize: 15 },
  content: { padding: 18, gap: 16, paddingBottom: 40 },
  card: { ...paperCard, padding: 22, gap: 12 },
  wordRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10 },
  word: { ...T.display, fontSize: 32 },
  pos: { fontSize: 13, color: C.accent, fontWeight: '800' },
  meaning: { fontSize: 17, lineHeight: 26, color: C.ink, fontWeight: '700' },
  body: { ...T.body, fontSize: 15, color: C.sub },
  examples: { gap: 6, paddingLeft: 10, borderLeftWidth: 3, borderLeftColor: C.grainSoft },
  example: { fontSize: 15, lineHeight: 23, color: C.ink },
  tip: { fontSize: 14, lineHeight: 21, color: C.sub, backgroundColor: C.grainSoft, borderRadius: 10, padding: 10, overflow: 'hidden' },
  quiz: { gap: 10 },
  quizLabel: { fontSize: 13, color: C.accent, fontWeight: '800' },
  prompt: { fontSize: 18, lineHeight: 27, color: C.ink, fontWeight: '700' },
  choice: { ...paperCard, padding: 14, gap: 6, borderRadius: R.button },
  choiceRight: { backgroundColor: C.goodSoft, borderColor: '#BFDDC6' },
  choiceWrong: { backgroundColor: C.badSoft, borderColor: '#EDC1BA' },
  choiceText: { fontSize: 15, lineHeight: 22, color: C.ink, fontWeight: '600' },
  reason: { fontSize: 13, lineHeight: 19, color: C.sub },
  verdict: { fontSize: 15, fontWeight: '800', textAlign: 'center', marginTop: 4 },
  doneText: { fontSize: 13, color: C.faint, textAlign: 'center' },
});
