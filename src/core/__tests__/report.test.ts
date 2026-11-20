import { reportUrl, REPORT_TARGET_MAX } from '../report';
import type { AppQuestion } from '../types';

const q: AppQuestion = { key: 'chosung:1098-1-1', type: 'chosung', kind: 'typed', prompt: 'ㄴㅂㄱ — 실내의 온도를 높여 따뜻하게 하는 장치.', answer: '난방기', explain: '', source: 'adapted', easy: true };

test('reportUrl: 웹 제보 화면을 잘못된 데이터 종류로, 문제 키·정답·묶음·문제 글을 채워 연다', () => {
  const url = new URL(reportUrl(q, 'abc123', '1.0.0'));
  expect(url.origin + url.pathname).toBe('https://woorimal-contest.co.kr/report.html');
  expect(url.searchParams.get('kind')).toBe('data');
  expect(url.searchParams.get('target')).toBe('[앱] chosung:1098-1-1 · 정답 난방기 · 묶음 abc123 · 앱 1.0.0 · ㄴㅂㄱ — 실내의 온도를 높여 따뜻하게 하는 장치.');
  expect(url.searchParams.has('from')).toBe(false);
});

test('reportUrl: 대상 글은 웹 상한(200자)을 넘지 않고, 줄바꿈은 한 칸 띄움으로', () => {
  const long = { ...q, prompt: '가'.repeat(500) + '\n둘째 줄' };
  const target = new URL(reportUrl(long, 'v', '1.0.0')).searchParams.get('target')!;
  expect(target.length).toBeLessThanOrEqual(REPORT_TARGET_MAX);
  expect(target.startsWith('[앱] chosung:1098-1-1 · 정답 난방기 · 묶음 v · 앱 1.0.0 · 가가')).toBe(true);
  expect(target).not.toMatch(/\n/);
});
