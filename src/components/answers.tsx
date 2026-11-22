// 문제 방식별 답 입력: 보기 고르기, 직접 입력, 띄울 자리 누르기.
import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { C, elevation, R, T } from '../ui/theme';
import { undoGaps } from '../core/input-history';

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

export function TypedAnswer({ chosung, onSubmit, disabled, value, onChange }: { chosung?: string; onSubmit(text: string): void; disabled: boolean; value?:string; onChange?(text:string):void }) {
  const [localText, setLocalText] = useState('');
  const text=value??localText;
  const setText=(next:string)=>{setLocalText(next);onChange?.(next);};
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

export function SpacingAnswer({ syllables, onSubmit, disabled, value, onChange }: { syllables: string[]; onSubmit(gaps: boolean[]): void; disabled: boolean;value?:boolean[];onChange?(gaps:boolean[]):void }) {
  const [localGaps, setLocalGaps] = useState<boolean[]>(() => Array(Math.max(0, syllables.length - 1)).fill(false));
  const gaps=value??localGaps;
  const [history,setHistory]=useState<boolean[][]>(()=>[gaps]);
  const [selected,setSelected]=useState(0);
  const setGaps=(fn:(old:boolean[])=>boolean[])=>{const next=fn(gaps);setHistory(h=>[...h,next].slice(-100));setLocalGaps(next);onChange?.(next);};
  const undo=()=>{const next=undoGaps(history);setHistory(next);setLocalGaps(next[next.length-1]);onChange?.(next[next.length-1]);};
  const widths = useRef<number[]>([]);
  const last = syllables.length - 1;
  const toggle = (i: number) => {
    if (i < 0 || i >= last) return;
    setSelected(i);
    setGaps(g => g.map((v, j) => (j === i ? !v : v)));
  };
  // 글자 자체가 터치 칸이다. 오른쪽 절반은 뒤 자리, 왼쪽 절반은 앞 자리를 바꾼다.
  // 칸끼리 겹치지 않으므로 좁은 문장부호 옆에서도 이웃 자리가 잘못 눌리지 않는다.
  const pressSyllable = (i: number, x: number) => {
    if (i === 0) return toggle(0);
    if (i === last) return toggle(last - 1);
    toggle(x >= (widths.current[i] ?? 0) / 2 ? i : i - 1);
  };
  return (
    <View>
      <View style={s.syllables}>
        {syllables.map((ch, i) => (
          // 글자와 그 뒤 자리를 한 묶음으로 두어, 띄운 자리가 줄 맨 앞에 홀로 오지 않게 한다.
          <View key={i} style={s.unit}>
            <Pressable testID={`syllable-${i}`} disabled={disabled} accessible={false} hitSlop={VSLOP}
              onLayout={e => { widths.current[i] = e.nativeEvent.layout.width; }}
              onPress={e => pressSyllable(i, e.nativeEvent.locationX)}>
              <Text style={s.syllable}>{ch}</Text>
            </Pressable>
            {i < last ? <Gap index={i} on={gaps[i]} disabled={disabled} onPress={() => toggle(i)} /> : null}
          </View>
        ))}
      </View>
      {last>0 && <View style={{gap:8,marginTop:12}}>
        <Text accessibilityLiveRegion="polite" style={{color:C.sub}}>{selected+1}번째 글자 뒤: {gaps[selected]?'띄어 쓰기':'붙여 쓰기'}</Text>
        <View style={{flexDirection:'row',gap:8}}>
          <Pressable accessibilityRole="button" accessibilityLabel="앞 자리" disabled={selected===0||disabled} onPress={()=>setSelected(i=>Math.max(0,i-1))} style={s.position}><Text>앞 자리</Text></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="선택한 자리 바꾸기" disabled={disabled} onPress={()=>toggle(selected)} style={s.position}><Text>선택한 자리 바꾸기</Text></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="뒤 자리" disabled={selected>=last-1||disabled} onPress={()=>setSelected(i=>Math.min(last-1,i+1))} style={s.position}><Text>뒤 자리</Text></Pressable>
        </View>
        <View style={{flexDirection:'row',gap:16}}>
          <Pressable accessibilityRole="button" disabled={disabled||history.length<2} onPress={undo} style={s.position}><Text>되돌리기</Text></Pressable>
          <Pressable accessibilityRole="button" disabled={disabled} onPress={()=>setGaps(g=>g.map(()=>false))} style={s.position}><Text>처음으로</Text></Pressable>
        </View>
      </View>}
      <Pressable disabled={disabled} onPress={() => onSubmit(gaps)} style={({ pressed }) => [s.submit, s.submitWide, pressed && s.pressed]} accessibilityRole="button">
        <Text style={s.submitText}>확인</Text>
      </Pressable>
    </View>
  );
}

const VSLOP = { top: 6, bottom: 6 };
const GAP_OFF = 4;
const GAP_ON = 22;

// 자리 하나. 폭 애니메이션은 이 자리에만 걸린다(LayoutAnimation처럼 화면 전체에 번지지 않게).
function Gap({ index, on, disabled, onPress }: { index: number; on: boolean; disabled: boolean; onPress(): void }) {
  const width = useRef(new Animated.Value(on ? GAP_ON : GAP_OFF)).current;
  useEffect(() => {
    const anim = Animated.timing(width, { toValue: on ? GAP_ON : GAP_OFF, duration: 140, easing: Easing.out(Easing.quad), useNativeDriver: false });
    anim.start();
    return () => anim.stop();
  }, [on, width]);
  return (
    <Pressable disabled={disabled} onPress={onPress} hitSlop={VSLOP} accessibilityRole="button"
      accessibilityState={{ selected: on, disabled }} accessibilityLabel={`${index + 1}번째 글자 뒤 띄우기`}>
      <Animated.View style={[s.gap, on && s.gapOn, { width }]}>
        {on ? <Text style={s.gapMark}>∨</Text> : null}
      </Animated.View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  position:{minHeight:48,paddingHorizontal:10,justifyContent:'center',alignItems:'center',borderRadius:10,backgroundColor:C.grainSoft,flexShrink:1},
  choices: { gap: 10 },
  choice: { backgroundColor: C.paper, borderWidth: 1.5, borderColor: C.line, borderBottomWidth: 3, borderBottomColor: '#E0D2B9', borderRadius: R.button, paddingVertical: 16, paddingHorizontal: 18, ...elevation(1) },
  choiceText: { fontSize: 17, color: C.ink, fontWeight: '600' },
  pressed: { transform: [{ translateY: 2 }], borderBottomWidth: 1.5, backgroundColor: C.grainSoft },
  chosung: { ...T.num, fontSize: 34, lineHeight: 44, letterSpacing: 10, color: C.accent, textAlign: 'center', marginBottom: 14 },
  inputRow: { flexDirection: 'row', gap: 8 },
  input: { flex: 1, backgroundColor: C.paper, borderWidth: 1.5, borderColor: C.grain, borderRadius: R.button, paddingHorizontal: 16, fontSize: 20, color: C.ink, minHeight: 56 },
  submit: { backgroundColor: C.ink, borderRadius: R.button, paddingHorizontal: 22, justifyContent: 'center', alignItems: 'center', minHeight: 56, borderBottomWidth: 3, borderBottomColor: '#120D09' },
  submitWide: { marginTop: 16 },
  submitText: { color: C.grainLight, fontSize: 17, fontWeight: '800' },
  syllables: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', rowGap: 14, backgroundColor: C.paper, borderWidth: 1, borderColor: C.line, borderRadius: R.card, paddingVertical: 18, paddingHorizontal: 18 },
  syllable: { fontSize: 28, lineHeight: 40, color: C.ink },
  unit: { flexDirection: 'row', alignItems: 'center' },
  // 붙은 자리: 글자 사이 좁은 틈. 띄운 자리: 벌어지고 교정부호 ∨로 표시.
  gap: { height: 40, borderRadius: 6, alignItems: 'center', justifyContent: 'flex-start', overflow: 'hidden' },
  gapOn: { marginHorizontal: 3, backgroundColor: C.grainSoft, borderBottomWidth: 3, borderBottomColor: C.accent },
  gapMark: { fontSize: 15, lineHeight: 18, fontWeight: '800', color: C.accent },
});
