// 앱에 번들하는 그림·영상. 원본과 만든 방법은 docs/design/assets.md에 있다.
// 실행 중에 외부 생성 서비스를 부르지 않는다. 모두 정적 파일이다.
export const ART = {
  squirrel: {
    idle: require('./squirrel-idle.webp'),
    cheer: require('./squirrel-cheer.webp'),
    think: require('./squirrel-think.webp'),
  },
  barn: [require('./barn-1.webp'), require('./barn-2.webp'), require('./barn-3.webp')],
  hero: [require('./hero-1.webp'), require('./hero-2.webp'), require('./hero-3.webp')],
  levelUp: require('./levelup.webp'),
  acorn: require('./acorn.webp'),
  grain: require('./grain.webp'),
  decoration: {
    'leaf-flag': require('./deco-leaf-flag.webp'),
    'word-sign': require('./deco-word-sign.webp'),
    scarecrow: require('./deco-scarecrow.webp'),
    'clay-jars': require('./deco-clay-jars.webp'),
    kite: require('./deco-kite.webp'),
    'acorn-basket': require('./deco-acorn-basket.webp'),
    'stone-lantern': require('./deco-stone-lantern.webp'),
    'persimmon-tree': require('./deco-persimmon-tree.webp'),
    'scholar-desk': require('./deco-scholar-desk.webp'),
    magpie: require('./deco-magpie.webp'),
    watermill: require('./deco-watermill.webp'),
    'golden-gourd': require('./deco-golden-gourd.webp'),
  },
} as const;

export const VIDEO = {
  hero: [require('./hero-1.mp4'), require('./hero-2.mp4'), require('./hero-3.mp4')],
  levelUp: require('./levelup.mp4'),
} as const;
