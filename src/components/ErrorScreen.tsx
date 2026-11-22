// 화면에서 예외가 나면 앱을 끄는 대신 보이는 화면(expo-router ErrorBoundary). 기록은 기기에 남아 있다.
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { C, T } from '../ui/theme';
type Props = {
  error: Error;
  retry: () => Promise<void>;
};
export function ErrorScreen({
  retry
}: Props) {
  const home = () => {
    router.replace('/');
    void retry();
  };
  return <View style={s.screen}>
      <Text style={s.title}>문제가 생겼어요</Text>
      <Text style={s.body}>마지막으로 저장한 기록에서 다시 시작할 수 있어요. 다시 시도해 주세요.</Text>
      <Pressable style={[s.button, s.primary]} onPress={() => void retry()} accessibilityRole="button">
        <Text style={s.primaryText}>다시 시도</Text>
      </Pressable>
      <Pressable style={s.button} onPress={home} accessibilityRole="button">
        <Text style={s.secondaryText}>처음으로</Text>
      </Pressable>
    </View>;
}
const s = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
    backgroundColor: C.bg
  },
  title: {
    ...T.title,
    fontSize: 22
  },
  body: {
    fontSize: 15,
    color: C.sub,
    textAlign: 'center',
    marginBottom: 12
  },
  button: {
    minWidth: 200,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: C.line
  },
  primary: {
    backgroundColor: C.grain,
    borderColor: C.grain
  },
  primaryText: {
    fontSize: 16,
    fontWeight: '700',
    color: C.ink
  },
  secondaryText: {
    fontSize: 16,
    fontWeight: '700',
    color: C.sub
  }
});
