// app.json을 그대로 쓰되, EAS development 프로필(APP_VARIANT=development)일 때만
// 패키지 이름과 앱 이름을 바꿔 preview·production APK와 한 기기에 함께 설치되게 한다.
module.exports = ({ config }) => {
  if (process.env.APP_VARIANT !== 'development') return config;
  return {
    ...config,
    name: `${config.name} (개발)`,
    android: { ...config.android, package: `${config.android.package}.dev` },
  };
};
