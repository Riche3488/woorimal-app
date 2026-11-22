import { Text, View } from 'react-native';
import { DECORATIONS, type DecorationId } from '../core/decorations';
import { C } from '../ui/theme';
export function BarnDecorations({
  id
}: {
  id: DecorationId | null;
}) {
  if (!id) return null;
  return <View accessible accessibilityLabel={`장착한 장식: ${DECORATIONS[id].name}`} style={{
    position: 'absolute',
    bottom: 12,
    right: 20,
    alignItems: 'center'
  }}>
    <View style={{
      borderColor: C.ink,
      borderWidth: 2,
      borderRadius: id === 'acorn-basket' ? 12 : 4,
      backgroundColor: id === 'leaf-flag' ? C.goodSoft : C.grainSoft,
      padding: 8
    }}><Text style={{
        color: C.ink,
        fontWeight: '800'
      }}>{id === 'word-sign' ? '가나다' : id === 'leaf-flag' ? '❧' : '🌰'}</Text></View>
    <Text style={{
      fontSize: 11,
      color: C.ink,
      backgroundColor: C.paper,
      padding: 3
    }}>{DECORATIONS[id].name}</Text>
  </View>;
}
