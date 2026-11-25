import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Linking, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PlayScreen } from '../components/PlayScreen';
import { reportUrl } from '../core/report';
import type { RoundMode } from '../core/session';
import type { AppQuestion, QuestionType } from '../core/types';
import { APP_VERSION, TEST_MODE_OK } from '../data/build';
import { useGame } from '../state/GameProvider';
import { goHome } from '../ui/navigation';
import { C } from '../ui/theme';
const MODES = ['normal', 'review', 'starred', 'practice', 'challenge', 'quick'];
export default function Play() {
  const {
    mode = 'normal',
    type,
    count
  } = useLocalSearchParams<{
    mode?: string;
    type?: string;
    count?: string;
  }>();
  const game = useGame();
  const started = useRef(false);
  const [accepted, setAccepted] = useState(mode === 'resume');
  const [message, setMessage] = useState('문제를 준비하고 있어요');
  const session = game.save.activeSession;
  const playingId = useRef<string | null>(null);
  if (session && accepted) playingId.current = session.id;
  useEffect(() => {
    if (!session && playingId.current && game.save.lastOutcome?.session.id === playingId.current) router.replace('/result');
  }, [session, game.save.lastOutcome]);
  useEffect(() => {
    if (started.current || session || mode === 'resume' || !game.sessions) return;
    started.current = true;
    const validType = ['meaning', 'usage', 'spacing', 'spelling', 'proverb', 'chosung', 'broadcast'].includes(type ?? '') ? type as QuestionType : undefined;
    const roundMode = (MODES.includes(mode) && (mode !== 'practice' || validType) ? mode : 'normal') as RoundMode;
    const requestedCount = Number(count);
    void game.sessions.begin(roundMode, validType, Number.isInteger(requestedCount) && requestedCount > 0 ? Math.min(10, requestedCount) : undefined).then(() => setAccepted(true)).catch(error => setMessage(error.message));
  }, [game.sessions, session, mode, type]);
  const home = goHome;
  const report = (q: AppQuestion) => {
    void Linking.openURL(reportUrl(q, session?.context.packVersion ?? game.pack.version, APP_VERSION)).catch(() => Alert.alert('신고 화면을 열 수 없어요', '인터넷 연결을 확인해 주세요.'));
  };
  return <SafeAreaView style={{
    flex: 1,
    backgroundColor: C.bg
  }}>
    {session && accepted ? <PlayScreen key={session.id} questions={session.round.questions} initialSession={session} onCheckpoint={s => game.sessions!.checkpoint(s)} onFinish={async () => {
      await game.sessions!.finish(session.id);
    }} onExit={home} haptics={game.save.settings.haptics} testMode={TEST_MODE_OK && game.save.settings.testMode} showHearts={session.context.mode !== 'challenge'} starred={key => !!game.save.progress.stats[key]?.starred} onToggleStar={game.toggleStar} onReport={report} /> : <View style={{
      flex: 1,
      padding: 24,
      justifyContent: 'center',
      gap: 24
    }}>
      <Text style={{
        fontSize: 18,
        color: C.ink
      }}>{session ? '진행 중인 판이 있어요. 이어 하거나 홈에서 끝낼 수 있어요.' : mode === 'resume' ? '진행 중인 판이 없어요' : message}</Text>
      {session && <Pressable accessibilityRole="button" onPress={() => setAccepted(true)}><Text style={{
          color: C.accent,
          fontSize: 18
        }}>이어서 풀기</Text></Pressable>}
      <Pressable accessibilityRole="button" onPress={home}><Text style={{
          color: C.accent,
          fontSize: 18
        }}>홈으로</Text></Pressable>
    </View>}
  </SafeAreaView>;
}
