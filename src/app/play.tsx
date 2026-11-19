import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PlayScreen } from '../components/PlayScreen';
import { CHALLENGE_SIZE } from '../core/challenge';
import { localDay } from '../core/growth';
import type { Round } from '../core/round';
import { useGame } from '../state/GameProvider';
import { C } from '../ui/theme';

export default function Play() {
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const game = useGame();
  const challenge = mode === 'challenge';
  const doneToday = challenge && game.save.challenge.day === localDay(new Date());
  // 화면이 열릴 때 한 번만 문제를 뽑는다.
  const [questions] = useState(() =>
    doneToday ? [] : challenge ? game.startChallenge() : mode === 'review' ? game.startReview() : game.startNormal());

  const finish = (round: Round) => {
    game.complete(round, challenge ? 'challenge' : mode === 'review' ? 'review' : 'normal');
    router.replace('/result');
  };

  return (
    <SafeAreaView style={s.screen}>
      {questions.length ? (
        <PlayScreen questions={questions} onFinish={finish} haptics={game.save.settings.haptics} testMode={game.save.settings.testMode}
          hearts={challenge ? CHALLENGE_SIZE : undefined} showHearts={!challenge} />
      ) : (
        <View style={s.empty}><Text style={s.emptyText}>{doneToday ? '오늘의 문제는 이미 풀었어요. 내일 새 문제가 나와요' : '풀 문제가 없어요'}</Text></View>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: C.sub, fontSize: 16 },
});
