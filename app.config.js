// app.json을 그대로 쓰되, 개발 빌드(APP_VARIANT=development: EAS development 프로필과
// npm 스크립트 android·start·start:android)일 때만 패키지 이름·앱 이름·스킴을 바꿔
// preview·스토어 앱과 한 기기에 함께 설치되고 링크도 서로 가로채지 않게 한다.
module.exports = ({ config }) => {
  if (process.env.APP_VARIANT !== 'development') {
    // expo-dev-client는 자동으로 적용되며 개발 실행기용 exp+<slug> 스킴을 매니페스트에 넣는다.
    // 스토어·preview 빌드에는 필요 없으니 뺀다(개발 실행기 코드 자체는 릴리스에서 이미 빠진다).
    return { ...config, plugins: [...(config.plugins ?? []), ['expo-dev-client', { addGeneratedScheme: false }]] };
  }
  return {
    ...config,
    name: `${config.name} (개발)`,
    scheme: `${config.scheme}-dev`,
    android: { ...config.android, package: `${config.android.package}.dev` },
  };
};
