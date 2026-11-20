import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PRIVACY_URL } from '../core/app-info';
import { creditLines } from '../core/labels';
import { REMINDER_HOURS } from '../core/reminder';
import { APP_VERSION, TEST_MODE_OK } from '../data/build';
import { requestReminderPermission } from '../data/reminder';
import { useGame } from '../state/GameProvider';
import { C, paperCard, T } from '../ui/theme';

// 묶음 정보 줄을 이만큼 연달아 누르면 테스트 모드 스위치가 나타난다(개발·preview 빌드만, src/data/build.ts).
const UNLOCK_TAPS = 7;

const hourLabel = (h: number) => (h < 12 ? `오전 ${h}시` : `오후 ${h === 12 ? 12 : h - 12}시`);

export default function Settings() {
  const { pack, save, updateSettings, resetRecords } = useGame();
  const [taps, setTaps] = useState(0);
  const showTest = TEST_MODE_OK && (save.settings.testMode || taps >= UNLOCK_TAPS);

  // 켤 때 알림 권한을 묻는다. 거절하면 켜지 않는다.
  const toggleReminder = async (on: boolean) => {
    if (on && !(await requestReminderPermission().catch(() => false))) {
      Alert.alert('알림을 켤 수 없어요', '휴대폰 설정에서 우리말 곳간의 알림을 허용해 주세요.');
      return;
    }
    updateSettings({ reminder: on });
  };

  const openPrivacy = () => Linking.openURL(PRIVACY_URL).catch(() => Alert.alert('개인정보처리방침을 열 수 없어요', '인터넷 연결을 확인해 주세요.'));

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
      <ScrollView contentContainerStyle={s.content}>
        <View style={s.row}>
          <Text style={s.label}>진동</Text>
          <Switch value={save.settings.haptics} onValueChange={v => updateSettings({ haptics: v })}
            trackColor={{ true: C.grain, false: C.line }} accessibilityLabel="진동" />
        </View>
        <View style={s.row}>
          <View style={{ flexShrink: 1 }}>
            <Text style={s.label}>보기로 풀기</Text>
            <Text style={s.desc}>직접 입력하는 첫소리·뜻·속담 문제를 보기 4개 중에서 고릅니다. 오늘의 문제는 그대로예요</Text>
          </View>
          <Switch value={save.settings.choiceMode} onValueChange={v => updateSettings({ choiceMode: v })}
            trackColor={{ true: C.grain, false: C.line }} accessibilityLabel="보기로 풀기" />
        </View>
        <View style={[s.row, { flexDirection: 'column', alignItems: 'stretch' }]}>
          <View style={s.inline}>
            <View style={{ flexShrink: 1 }}>
              <Text style={s.label}>학습 알림</Text>
              <Text style={s.desc}>하루 한 번, 복습할 문제나 연속 기록을 알려 드려요</Text>
            </View>
            <Switch value={save.settings.reminder} onValueChange={toggleReminder}
              trackColor={{ true: C.grain, false: C.line }} accessibilityLabel="학습 알림" />
          </View>
          {save.settings.reminder ? (
            <View style={s.hours}>
              {REMINDER_HOURS.map(h => (
                <Pressable key={h} onPress={() => updateSettings({ reminderHour: h })} accessibilityRole="button"
                  accessibilityState={{ selected: save.settings.reminderHour === h }}
                  style={[s.hour, save.settings.reminderHour === h && s.hourOn]}>
                  <Text style={[s.hourText, save.settings.reminderHour === h && s.hourTextOn]}>{hourLabel(h)}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
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
        <Pressable style={s.row} onPress={openPrivacy} accessibilityRole="link">
          <Text style={s.label}>개인정보처리방침</Text>
          <Text style={s.chevron}>›</Text>
        </Pressable>
        <Pressable style={s.info} onPress={() => setTaps(t => t + 1)}>
          <Text style={s.infoText}>앱 {APP_VERSION} · 문제 {pack.questions.length.toLocaleString()}개 · 묶음 {pack.version}</Text>
          {creditLines(pack.questions).map(line => <Text key={line} style={s.infoText}>{line}</Text>)}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12 },
  back: { fontSize: 16, color: C.sub, fontWeight: '700', width: 48 },
  title: { ...T.title, fontSize: 20 },
  content: { padding: 20, gap: 12 },
  row: { ...paperCard, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: 16 },
  label: { fontSize: 16, color: C.ink, fontWeight: '600' },
  chevron: { fontSize: 20, color: C.faint },
  desc: { fontSize: 12, color: C.sub, marginTop: 2 },
  inline: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  hours: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  hour: { paddingVertical: 7, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: C.line, backgroundColor: C.bg },
  hourOn: { backgroundColor: C.grain, borderColor: C.grain },
  hourText: { fontSize: 13, color: C.sub, fontWeight: '700' },
  hourTextOn: { color: C.ink },
  info: { marginTop: 12, gap: 4 },
  infoText: { fontSize: 12, color: C.faint },
});
