import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PlayScreen } from '../components/PlayScreen';
import type { Round } from '../core/round';
import { useGame } from '../state/GameProvider';
import { C } from '../ui/theme';

export default function Play() {
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const game = useGame();
  // 화면이 열릴 때 한 번만 문제를 뽑는다.
  const [questions] = useState(() => (mode === 'review' ? game.startReview() : game.startNormal()));

  const finish = (round: Round) => {
    game.complete(round);
    router.replace('/result');
  };

  return (
    <SafeAreaView style={s.screen}>
      {questions.length ? (
        <PlayScreen questions={questions} onFinish={finish} haptics={game.save.settings.haptics} />
      ) : (
        <View style={s.empty}><Text style={s.emptyText}>풀 문제가 없어요</Text></View>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: C.sub, fontSize: 16 },
});
