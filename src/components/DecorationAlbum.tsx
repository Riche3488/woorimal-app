// 장식 도감: 모은 수·등급·남은 진행도. 얻은 장식을 눌러 곳간 자리 3곳에 놓거나 뺀다.
// 이 화면을 열면 새로 얻은 장식을 '확인함'으로 바꾸되, 열려 있는 동안은 NEW 표시를 남긴다.
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ART } from '../../assets/art';
import { DECORATION_IDS, DECORATIONS, RARITY_LABEL, SLOTS, decorationProgress, newDecorations, type Rarity } from '../core/decorations';
import { useGame } from '../state/GameProvider';
import { C, paperCard, R, T } from '../ui/theme';
const RARITY_COLOR: Record<Rarity, string> = { common: C.sub, rare: C.good, epic: C.accent };
export function DecorationAlbum() {
  const game = useGame();
  const { save } = game;
  const [fresh] = useState(() => newDecorations(save));
  const [hint, setHint] = useState<string | null>(null);
  useEffect(() => {
    if (fresh.length) game.markDecorationsSeen?.();
    // 처음 열 때 한 번만
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const { unlocked, equipped } = save.decorations;
  const used = equipped.filter(Boolean).length;
  return <View style={s.wrap}>
      <View style={s.head}>
        <Text style={s.title}>곳간 장식</Text>
        <Text style={s.count} accessibilityLabel={`장식 ${DECORATION_IDS.length}개 중 ${unlocked.length}개 모음`}>{unlocked.length}/{DECORATION_IDS.length}</Text>
      </View>
      <View style={s.track}><View style={[s.fill, { width: `${unlocked.length / DECORATION_IDS.length * 100}%` }]} /></View>
      <Text style={s.help}>얻은 장식을 누르면 곳간에 놓여요. 한 번에 {SLOTS}개까지 · 지금 {used}/{SLOTS}</Text>
      {hint ? <Text style={s.hint} accessibilityLiveRegion="polite">{hint}</Text> : null}
      <View style={s.grid}>
        {DECORATION_IDS.map(id => {
        const item = DECORATIONS[id],
          p = decorationProgress(save, id),
          slot = equipped.indexOf(id),
          on = slot >= 0,
          isNew = fresh.includes(id);
        const status = !p.done ? `${p.current}/${p.target}` : on ? '곳간에 있음' : '눌러서 놓기';
        return <Pressable key={id} accessibilityRole="button" accessibilityState={{ disabled: !p.done, selected: on }}
          accessibilityLabel={`${p.done ? item.name : '잠긴 장식'}, ${RARITY_LABEL[item.rarity]}, ${p.done ? status : `${item.condition} ${p.current}/${p.target}`}${isNew ? ', 새로 얻음' : ''}`}
          disabled={!p.done} onPress={() => {
            if (!on && used >= SLOTS) return setHint('자리가 꽉 찼어요. 곳간에 있는 장식을 눌러 하나를 빼 주세요.');
            setHint(null);
            game.equipDecoration?.(id);
          }} style={[s.card, on && s.cardOn]}>
            {isNew && <View style={s.newPill}><Text style={s.newText}>NEW</Text></View>}
            <Image source={ART.decoration[id]} style={[s.thumb, !p.done && s.locked]} tintColor={p.done ? undefined : C.faint} contentFit="contain" accessible={false} />
            <Text style={[s.rarity, { color: RARITY_COLOR[item.rarity] }]}>{RARITY_LABEL[item.rarity]}</Text>
            <Text style={s.name} numberOfLines={1}>{p.done ? item.name : '???'}</Text>
            {p.done ? <Text style={[s.status, on && s.statusOn]}>{status}</Text> : <>
                <Text style={s.cond} numberOfLines={2}>{item.condition}</Text>
                <View style={s.miniTrack}><View style={[s.miniFill, { width: `${p.current / p.target * 100}%` }]} /></View>
                <Text style={s.status}>{status}</Text>
              </>}
          </Pressable>;
      })}
      </View>
      {used > 0 && <Pressable accessibilityRole="button" onPress={() => { setHint(null); game.unequipDecorations?.(); }} style={s.clear}><Text style={s.clearText}>모두 빼기</Text></Pressable>}
    </View>;
}
const s = StyleSheet.create({
  wrap: { gap: 10 },
  head: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  title: { ...T.title, fontSize: 20 },
  count: { ...T.num, fontSize: 18, color: C.grainDeep },
  track: { height: 8, borderRadius: R.pill, backgroundColor: C.line, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: C.grain, borderRadius: R.pill },
  help: { fontSize: 13, color: C.faint, lineHeight: 19 },
  hint: { fontSize: 13, color: C.accent, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  card: { ...paperCard, width: '31%', flexGrow: 1, alignItems: 'center', paddingVertical: 10, paddingHorizontal: 6, gap: 2, minHeight: 168 },
  cardOn: { borderColor: C.grain, borderWidth: 2, backgroundColor: C.grainSoft },
  thumb: { width: 72, height: 72 },
  locked: { opacity: 0.4 },
  rarity: { fontSize: 11, fontWeight: '800' },
  name: { ...T.heading, fontSize: 14 },
  cond: { fontSize: 11, color: C.sub, textAlign: 'center', lineHeight: 15 },
  miniTrack: { alignSelf: 'stretch', marginHorizontal: 6, height: 5, borderRadius: R.pill, backgroundColor: C.line, overflow: 'hidden', marginTop: 2 },
  miniFill: { height: '100%', backgroundColor: C.grainDeep },
  status: { fontSize: 11, color: C.sub, fontWeight: '700' },
  statusOn: { color: C.grainDeep },
  newPill: { position: 'absolute', top: 6, right: 6, zIndex: 1, paddingHorizontal: 6, paddingVertical: 1, borderRadius: R.pill, backgroundColor: C.accent },
  newText: { fontSize: 10, color: C.paper, fontWeight: '800' },
  clear: { alignSelf: 'flex-start', paddingVertical: 8, paddingHorizontal: 14, borderRadius: R.pill, borderWidth: 1, borderColor: C.line, backgroundColor: C.paper },
  clearText: { fontSize: 13, color: C.sub, fontWeight: '700' },
});
