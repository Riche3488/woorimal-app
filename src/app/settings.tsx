import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useGame } from '../state/GameProvider';
import { C, R } from '../ui/theme';

// 묶음 정보 줄을 이만큼 연달아 누르면 테스트 모드 스위치가 나타난다.
const UNLOCK_TAPS = 7;

export default function Settings() {
  const { pack, save, updateSettings, resetRecords } = useGame();
  const [taps, setTaps] = useState(0);
  const showTest = save.settings.testMode || taps >= UNLOCK_TAPS;

  const confirmReset = () => Alert.alert('기록 초기화', '낱알·레벨·문제 기록을 모두 지웁니다.', [
    { text: '취소', style: 'cancel' },
    { text: '초기화', style: 'destructive', onPress: resetRecords },
  ]);

  return (
    <SafeAreaView style={s.screen}>
      <View style={s.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}><Text style={s.back}>‹ 뒤로</Text></Pressable>
        <Text style={s.title}>설정</Text>
        <View style={{ width: 48 }} />
      </View>
      <View style={s.content}>
        <View style={s.row}>
          <Text style={s.label}>진동</Text>
          <Switch value={save.settings.haptics} onValueChange={v => updateSettings({ haptics: v })}
            trackColor={{ true: C.grain, false: C.line }} accessibilityLabel="진동" />
        </View>
        {showTest ? (
          <>
            <View style={s.row}>
              <View style={{ flexShrink: 1 }}>
                <Text style={s.label}>테스트 모드</Text>
                <Text style={s.desc}>게임 화면에 정답과 정답·오답·시간 초과 버튼을 보여줍니다</Text>
              </View>
              <Switch value={save.settings.testMode} onValueChange={v => updateSettings({ testMode: v })}
                trackColor={{ true: C.accent, false: C.line }} accessibilityLabel="테스트 모드" />
            </View>
            {save.settings.testMode ? (
              <Pressable style={s.row} onPress={confirmReset} accessibilityRole="button">
                <Text style={[s.label, { color: C.bad }]}>기록 초기화</Text>
              </Pressable>
            ) : null}
          </>
        ) : null}
        <Pressable style={s.info} onPress={() => setTaps(t => t + 1)}>
          <Text style={s.infoText}>문제 {pack.questions.length.toLocaleString()}개 · 묶음 {pack.version}</Text>
          <Text style={s.infoText}>방송 기반 문제 출처: KBS 우리말 겨루기</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12 },
  back: { fontSize: 16, color: C.sub, fontWeight: '600', width: 48 },
  title: { fontSize: 18, fontWeight: '800', color: C.ink },
  content: { padding: 20, gap: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, backgroundColor: C.card, borderRadius: R.card, padding: 16, borderWidth: 1, borderColor: C.line },
  label: { fontSize: 16, color: C.ink, fontWeight: '600' },
  desc: { fontSize: 12, color: C.sub, marginTop: 2 },
  info: { marginTop: 12, gap: 4 },
  infoText: { fontSize: 12, color: C.faint },
});
