import { useEffect, useState } from 'react';
import { Alert, Pressable, Share, Switch, Text, View } from 'react-native';
import { clearExperienceDiagnostics, experienceDiagnosticsEnabled, exportExperienceDiagnostics, setExperienceDiagnostics } from '../data/experience-events';
import { C, paperCard } from '../ui/theme';
export function DiagnosticsSettings() {
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let alive = true;
    experienceDiagnosticsEnabled().then(v => {
      if (alive) setEnabled(v);
    }).catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  const toggle = async (on: boolean) => {
    setBusy(true);
    try {
      await setExperienceDiagnostics(on);
      setEnabled(on);
    } catch {
      Alert.alert('저장하지 못했어요', '다시 시도해 주세요.');
    } finally {
      setBusy(false);
    }
  };
  return <View style={{
    ...paperCard,
    padding: 16,
    gap: 12
  }}>
    <View style={{
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center'
    }}>
      <Text style={{
        color: C.ink,
        fontWeight: '600'
      }}>플레이 진단 기록</Text>
      <Switch accessibilityLabel="플레이 진단 기록" value={enabled} disabled={busy} onValueChange={toggle} />
    </View>
    <Text style={{
      color: C.sub,
      fontSize: 12
    }}>동의하면 풀이 시간과 진행 상황을 이 기기에만 30일, 최대 2,000개 보관해요. 입력한 답과 문제 문장은 기록하지 않아요. 끄면 진단 기록을 지워요. 학습 기록은 유지돼요.</Text>
    <View style={{
      flexDirection: 'row',
      gap: 20
    }}>
      <Pressable accessibilityRole="button" onPress={() => {
        void exportExperienceDiagnostics().then(message => Share.share({
          message
        })).catch(() => Alert.alert('내보내지 못했어요'));
      }}><Text style={{
          color: C.accent,
          paddingVertical: 12
        }}>진단 기록 내보내기</Text></Pressable>
      <Pressable accessibilityRole="button" onPress={() => {
        void clearExperienceDiagnostics().then(() => Alert.alert('진단 기록을 지웠어요')).catch(() => Alert.alert('지우지 못했어요'));
      }}><Text style={{
          color: C.accent,
          paddingVertical: 12
        }}>지우기</Text></Pressable>
    </View>
  </View>;
}
