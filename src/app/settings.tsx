import { router } from 'expo-router';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useGame } from '../state/GameProvider';
import { C, R } from '../ui/theme';

export default function Settings() {
  const { pack, save, updateSettings } = useGame();
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
        <View style={s.info}>
          <Text style={s.infoText}>문제 {pack.questions.length.toLocaleString()}개 · 묶음 {pack.version}</Text>
          <Text style={s.infoText}>방송 기반 문제 출처: KBS 우리말 겨루기</Text>
        </View>
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
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: C.card, borderRadius: R.card, padding: 16, borderWidth: 1, borderColor: C.line },
  label: { fontSize: 16, color: C.ink, fontWeight: '600' },
  info: { marginTop: 12, gap: 4 },
  infoText: { fontSize: 12, color: C.faint },
});
