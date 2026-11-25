// 기록·문제를 불러오지 못했을 때의 화면과, 저장·알림 예약 실패 띠.
// 띠는 화면 아래에 겹쳐 띄우고 내비게이션 바(안전 영역) 위로 올린다. 화면 끝까지 그리는(edge-to-edge) 기기에서도 가리지 않게.
import { useContext, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { C, paperCard, R, T } from '../ui/theme';

export type LoadErrorKind = 'pack' | 'io' | 'broken';

export function LoadErrorScreen({ kind, onRetry, onReset, resetError }: {
  kind: LoadErrorKind;
  onRetry: () => void;
  onReset: () => void;
  resetError: boolean;
}) {
  return <View style={s.screen}>
    <Text style={s.title}>문제가 생겼어요</Text>
    <Text style={s.body}>{kind === 'pack' ? '문제를 불러오지 못했어요. 앱을 다시 열거나 업데이트해 주세요.' : '기록을 불러오지 못했어요. 저장된 기록을 덮어쓰지 않았어요.'}</Text>
    {kind === 'io' && <Text style={s.hint}>휴대폰 저장 공간이 모자라면 생길 수 있어요. 공간을 비운 뒤 다시 시도해 주세요.</Text>}
    <Pressable style={[s.button, s.primary]} accessibilityRole="button" onPress={onRetry}>
      <Text style={s.primaryText}>다시 시도</Text>
    </Pressable>
    {kind === 'broken' && <>
      <Text style={s.hint}>기록이 손상되어 읽을 수 없어요. 새로 시작하면 손상된 기록은 기기 안에 따로 보관해 둬요.</Text>
      <Pressable style={s.button} accessibilityRole="button" onPress={onReset}>
        <Text style={s.secondaryText}>새로 시작하기</Text>
      </Pressable>
      {resetError && <Text style={s.error} accessibilityRole="alert">새로 시작하지 못했어요. 기기 저장 공간을 확인해 주세요.</Text>}
    </>}
  </View>;
}

export function NoticeStack({ children }: { children: ReactNode }) {
  // 테스트처럼 SafeAreaProvider가 없으면 0으로 둔다.
  const bottom = useContext(SafeAreaInsetsContext)?.bottom ?? 0;
  return <View pointerEvents="box-none" style={[s.stack, { bottom: bottom + 12 }]}>{children}</View>;
}

export function Notice({ message, action, onPress }: { message: string; action: string; onPress: () => void }) {
  return <View accessibilityRole="alert" style={s.notice}>
    <Text style={s.noticeText}>{message}</Text>
    <Pressable accessibilityRole="button" onPress={onPress} hitSlop={8} style={s.noticeButton}>
      <Text style={s.noticeAction}>{action}</Text>
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
    ...T.title
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: C.ink,
    textAlign: 'center'
  },
  hint: {
    fontSize: 13,
    lineHeight: 19,
    color: C.sub,
    textAlign: 'center'
  },
  button: {
    minWidth: 200,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: R.pill,
    borderWidth: 1,
    borderColor: C.line,
    marginTop: 4
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
  },
  error: {
    fontSize: 13,
    color: C.bad,
    textAlign: 'center'
  },
  stack: {
    position: 'absolute',
    left: 16,
    right: 16,
    gap: 8
  },
  notice: {
    ...paperCard,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: C.badSoft,
    borderColor: C.bad
  },
  noticeText: {
    flex: 1,
    fontSize: 14,
    color: C.ink,
    fontWeight: '600'
  },
  noticeButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: R.pill,
    backgroundColor: C.paper
  },
  noticeAction: {
    fontSize: 14,
    fontWeight: '700',
    color: C.accent
  }
});
