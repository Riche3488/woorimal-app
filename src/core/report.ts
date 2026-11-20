// 잘못된 문제 신고: 앱은 서버에 쓰지 않으므로(1차) 웹의 제보 화면(report.html)을 열고 문제 정보를 채워 준다.
// 웹 public/scripts/lib/report.mjs의 reportDefaultsFromParams가 kind·target을 읽는다. 대상 글 상한(TARGET_MAX)도 웹과 같게 둔다.
import { SHARE_URL } from './challenge';
import type { AppQuestion } from './types';

export const REPORT_TARGET_MAX = 200;

export function reportUrl(q: AppQuestion, packVersion: string): string {
  const target = ['[앱]', `${q.key} · 정답 ${q.answer} · 묶음 ${packVersion} · ${q.prompt}`].join(' ')
    .replace(/\s*\n\s*/g, ' ')
    .slice(0, REPORT_TARGET_MAX);
  const params = new URLSearchParams({ kind: 'data', target });
  return `${SHARE_URL}/report.html?${params}`;
}
