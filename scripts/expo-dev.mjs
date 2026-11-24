// 로컬 개발 실행(npm run android·start·start:android)을 개발 빌드 변형으로 돌린다.
// APP_VARIANT=development면 app.config.js가 패키지 이름(.dev)·앱 이름·스킴을 바꿔
// 같은 기기의 Play 테스트·스토어 앱(서명이 다름)과 부딪히지 않고, 그 저장 기록도 건드리지 않는다.
import { spawnSync } from 'node:child_process';

const result = spawnSync(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['expo', ...process.argv.slice(2)], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
  env: { ...process.env, APP_VARIANT: 'development' },
});
process.exit(result.status ?? 1);
