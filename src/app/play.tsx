import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Linking, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PlayScreen } from '../components/PlayScreen';
import { CHALLENGE_SIZE } from '../core/challenge';
import { localDay } from '../core/growth';
import type { Round } from '../core/round';
import { reportUrl } from '../core/report';
import type { AppQuestion, QuestionType } from '../core/types';
import { APP_VERSION, TEST_MODE_OK } from '../data/build';
import type { RoundMode } from '../data/save';
import { useGame } from '../state/GameProvider';
import { Image } from 'expo-image';
import { ART } from '../../assets/art';
import { C } from '../ui/theme';

export default function Play() {
  const { mode, type } = useLocalSearchParams<{ mode?: string; type?: string }>();
  const game = useGame();
  const challenge = mode === 'challenge';
  const doneToday = challenge && game.save.challenge.day === localDay(new Date());
  const roundMode: RoundMode = mode === 'challenge' || mode === 'review' || mode === 'starred' || (mode === 'practice' && type) ? mode : 'normal';
  // 화면이 열릴 때 한 번만 문제를 뽑는다.
  const [questions] = useState(() => {
    if (doneToday) return [];
    switch (roundMode) {
      case 'challenge': return game.startChallenge();
      case 'review': return game.startReview();
      case 'starred': return game.startStarred();
      case 'practice': return game.startPractice(type as QuestionType);
      default: return game.startNormal();
    }
  });

  const finish = (round: Round) => {
    game.complete(round, roundMode);
    router.replace('/result');
  };

  // 웹 제보 화면을 브라우저로 연다(앱은 서버에 쓰지 않는다). 판은 그대로 이어서 풀 수 있다.
  const report = (q: AppQuestion) => {
    Linking.openURL(reportUrl(q, game.pack.version, APP_VERSION)).catch(() => Alert.alert('신고 화면을 열 수 없어요', '인터넷 연결을 확인해 주세요.'));
  };

  return (
    <SafeAreaView style={s.screen}>
      {questions.length ? (
        <PlayScreen questions={questions} onFinish={finish} haptics={game.save.settings.haptics} testMode={TEST_MODE_OK && game.save.settings.testMode}
          hearts={challenge ? CHALLENGE_SIZE : undefined} showHearts={!challenge}
          starred={key => !!game.save.progress.stats[key]?.starred} onToggleStar={game.toggleStar} onReport={report} />
      ) : (
        <View style={s.empty}><Image source={ART.squirrel.think} style={s.emptyArt} contentFit="contain" accessible={false} /><Text style={s.emptyText}>{doneToday ? '오늘의 문제는 이미 풀었어요. 내일 새 문제가 나와요' : '풀 문제가 없어요'}</Text></View>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 24 },
  emptyArt: { width: 160, height: 160 },
  emptyText: { color: C.sub, fontSize: 16, fontWeight: '600', textAlign: 'center' },
});
