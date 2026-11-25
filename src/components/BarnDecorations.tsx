// 홈 디오라마 바닥에 장착한 장식 그림을 겹친다(곳간 영상과 같은 클레이 화풍).
// 자리 3곳: 왼쪽 끝(나무 앞) · 곳간 왼쪽 모서리 앞 · 오른쪽 끝. 세 곳간 단계 모두 다람쥐·문을 가리지 않게 맞췄다.
import { Image } from 'expo-image';
import { View, type DimensionValue } from 'react-native';
import { ART } from '../../assets/art';
import { DECORATIONS, type Slots } from '../core/decorations';
const SPOTS: { left?: DimensionValue; right?: DimensionValue }[] = [{ left: '0%' }, { left: '41%' }, { right: '0%' }];
export function BarnDecorations({
  slots
}: {
  slots: Slots;
}) {
  const items = slots.map((id, i) => ({ id, i })).filter(x => x.id !== null);
  if (items.length === 0) return null;
  return <View accessible accessibilityLabel={`장착한 장식: ${items.map(x => DECORATIONS[x.id!].name).join(', ')}`} pointerEvents="none" style={{
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '40%'
  }}>
    {items.map(({ id, i }) => <Image key={i} source={ART.decoration[id!]} contentFit="contain" accessible={false} style={[{
      position: 'absolute',
      bottom: 6,
      width: '19%',
      maxWidth: 92,
      aspectRatio: 1
    }, SPOTS[i]]} />)}
  </View>;
}
