// 한지 디오라마: 한지·볏짚·기와·단청에서 온 따뜻한 색. 1차는 밝은 화면 하나만 쓴다.
// 설계와 자산 규칙: docs/design/art-direction.md
import { Platform, type TextStyle, type ViewStyle } from 'react-native';

export const C = {
  bg: '#FBF6EC', // 한지
  paper: '#FFFDF8', // 카드 종이
  card: '#FFFDF8',
  ink: '#2B2118', // 먹
  sub: '#7A6A58',
  faint: '#A89A88',
  line: '#EADFCB',
  grain: '#D9A441', // 낱알
  grainDeep: '#B9832A',
  grainLight: '#F2C463', // 금빛 하이라이트
  grainSoft: '#F6E7C4',
  accent: '#B5562B', // 단청 주홍
  good: '#3E8E5A', // 솔잎
  goodSoft: '#E5F1E6',
  bad: '#C8443B',
  badSoft: '#F9E3DF',
  shadow: '#50341A',
};

export const R = { card: 18, button: 16, pill: 999 };

// 제목·숫자는 고운바탕(명조), 본문과 문제 글은 시스템 글꼴(가독성 우선).
export const FONT = { display: 'GowunBatang-Bold' };

export const T = {
  display: { fontFamily: FONT.display, fontSize: 30, lineHeight: 40, color: C.ink },
  title: { fontFamily: FONT.display, fontSize: 22, lineHeight: 30, color: C.ink },
  heading: { fontSize: 17, fontWeight: '800', color: C.ink },
  body: { fontSize: 16, lineHeight: 24, color: C.ink },
  caption: { fontSize: 13, color: C.sub },
  num: { fontFamily: FONT.display, color: C.ink },
} satisfies Record<string, TextStyle>;

// 부드러운 접지 그림자(종이가 살짝 떠 있는 느낌).
export const elevation = (level: 1 | 2 | 3): ViewStyle => {
  const e = { 1: [2, 6, 0.08, 2], 2: [4, 12, 0.1, 4], 3: [8, 20, 0.14, 8] }[level];
  return Platform.select<ViewStyle>({
    android: { elevation: e[3], shadowColor: C.shadow },
    default: { shadowColor: C.shadow, shadowOffset: { width: 0, height: e[0] }, shadowRadius: e[1], shadowOpacity: e[2] },
  })!;
};

// 종이 카드: 따뜻한 흰 종이 + 얇은 테두리 + 낮은 그림자.
export const paperCard: ViewStyle = {
  backgroundColor: C.paper,
  borderRadius: R.card,
  borderWidth: 1,
  borderColor: C.line,
  ...elevation(1),
};
