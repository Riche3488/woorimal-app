// 문제 방식별 답 입력: 보기 고르기, 직접 입력, 띄울 자리 누르기.
import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { C, R } from '../ui/theme';

export function ChoiceAnswer({ choices, onPick, disabled }: { choices: string[]; onPick(c: string): void; disabled: boolean }) {
  return (
    <View style={s.choices}>
      {choices.map(c => (
        <Pressable key={c} disabled={disabled} onPress={() => onPick(c)}
          style={({ pressed }) => [s.choice, pressed && s.pressed]} accessibilityRole="button">
          <Text style={s.choiceText}>{c}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function TypedAnswer({ chosung, onSubmit, disabled }: { chosung?: string; onSubmit(text: string): void; disabled: boolean }) {
  const [text, setText] = useState('');
  const ref = useRef<ComponentRef<typeof TextInput>>(null);
  useEffect(() => { if (!disabled) ref.current?.focus(); }, [disabled]);
  return (
    <View>
      {chosung ? <Text style={s.chosung}>{chosung}</Text> : null}
      <View style={s.inputRow}>
        <TextInput ref={ref} value={text} onChangeText={setText} editable={!disabled} autoFocus
          onSubmitEditing={() => onSubmit(text)} submitBehavior="submit" returnKeyType="done"
          autoCorrect={false} autoCapitalize="none" placeholder="정답 입력" placeholderTextColor={C.faint}
          style={s.input} accessibilityLabel="답 입력" />
        <Pressable disabled={disabled} onPress={() => onSubmit(text)} style={({ pressed }) => [s.submit, pressed && s.pressed]} accessibilityRole="button">
          <Text style={s.submitText}>확인</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function SpacingAnswer({ syllables, onSubmit, disabled }: { syllables: string[]; onSubmit(gaps: boolean[]): void; disabled: boolean }) {
  const [gaps, setGaps] = useState<boolean[]>(() => Array(Math.max(0, syllables.length - 1)).fill(false));
  const toggle = (i: number) => setGaps(g => g.map((v, j) => (j === i ? !v : v)));
  return (
    <View>
      <View style={s.syllables}>
        {syllables.map((ch, i) => (
          <View key={i} style={s.syllableWrap}>
            <Text style={s.syllable}>{ch}</Text>
            {i < syllables.length - 1 ? (
              <Pressable disabled={disabled} onPress={() => toggle(i)} hitSlop={6}
                style={[s.gap, gaps[i] && s.gapOn]} accessibilityLabel={`${i + 1}번째 글자 뒤 띄우기`} />
            ) : null}
          </View>
        ))}
      </View>
      <Pressable disabled={disabled} onPress={() => onSubmit(gaps)} style={({ pressed }) => [s.submit, s.submitWide, pressed && s.pressed]} accessibilityRole="button">
        <Text style={s.submitText}>확인</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  choices: { gap: 10 },
  choice: { backgroundColor: C.card, borderWidth: 1.5, borderColor: C.line, borderRadius: R.button, paddingVertical: 16, paddingHorizontal: 16 },
  choiceText: { fontSize: 17, color: C.ink },
  pressed: { opacity: 0.6, transform: [{ scale: 0.98 }] },
  chosung: { fontSize: 30, letterSpacing: 6, fontWeight: '700', color: C.accent, textAlign: 'center', marginBottom: 14 },
  inputRow: { flexDirection: 'row', gap: 8 },
  input: { flex: 1, backgroundColor: C.card, borderWidth: 1.5, borderColor: C.line, borderRadius: R.button, paddingHorizontal: 14, fontSize: 20, color: C.ink, minHeight: 54 },
  submit: { backgroundColor: C.ink, borderRadius: R.button, paddingHorizontal: 20, justifyContent: 'center', alignItems: 'center', minHeight: 54 },
  submitWide: { marginTop: 16 },
  submitText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  syllables: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 10 },
  syllableWrap: { flexDirection: 'row', alignItems: 'center' },
  syllable: { fontSize: 22, color: C.ink, paddingHorizontal: 1 },
  gap: { width: 10, height: 30, marginHorizontal: 1, borderRadius: 3, backgroundColor: C.line },
  gapOn: { width: 18, backgroundColor: C.grain },
});
