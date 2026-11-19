// 웹 저장소가 만든 앱용 문제 묶음을 앱에 내장한다. 먼저 웹 저장소에서 `npm run build`를 실행한다.
import { copyFile, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.resolve(root, process.argv[2] ?? '../woorimal_contest/public/app/pack.json');
const target = path.join(root, 'assets', 'pack.json');

try {
  await access(source);
} catch {
  console.error(`문제 묶음을 찾지 못했습니다: ${source}\n웹 저장소에서 npm run build를 먼저 실행하세요.`);
  process.exit(1);
}
await copyFile(source, target);
console.log(`복사 완료: ${source} → ${target}`);
