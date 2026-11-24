// 세로 고정(app.json orientation: portrait)은 Play가 android.hardware.screen.portrait를
// "필수 기능"으로 추정하게 만들어, 일부 기기(태블릿·Desktop·XR 등)에서 설치를 막고
// Play Console 검토 전송도 막는다. 화면은 그대로 세로로 고정하고, 기능만 선택사항으로 선언한다.
const { withAndroidManifest } = require('expo/config-plugins');

const FEATURE = 'android.hardware.screen.portrait';

module.exports = function withOptionalPortrait(config) {
  return withAndroidManifest(config, cfg => {
    const manifest = cfg.modResults.manifest;
    const features = (manifest['uses-feature'] ??= []);
    const existing = features.find(f => f.$?.['android:name'] === FEATURE);
    if (existing) existing.$['android:required'] = 'false';
    else features.push({ $: { 'android:name': FEATURE, 'android:required': 'false' } });
    return cfg;
  });
};
