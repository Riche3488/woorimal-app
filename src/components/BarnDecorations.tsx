// 홈 디오라마 오른쪽 아래에 장착한 장식 그림을 겹친다(곳간 영상과 같은 클레이 화풍).
import { Image } from 'expo-image';
import { View } from 'react-native';
import { ART } from '../../assets/art';
import { DECORATIONS, type DecorationId } from '../core/decorations';
export function BarnDecorations({
  id
}: {
  id: DecorationId | null;
}) {
  if (!id) return null;
  return <View accessible accessibilityLabel={`장착한 장식: ${DECORATIONS[id].name}`} pointerEvents="none" style={{
    position: 'absolute',
    bottom: 6,
    right: 10,
    width: 96,
    height: 96
  }}>
    <Image source={ART.decoration[id]} style={{
      width: '100%',
      height: '100%'
    }} contentFit="contain" accessible={false} />
  </View>;
}
