import { creditLines, sourceNote } from '../labels';

test('다시 만든(adapted) 문제에는 KBS 출처를 붙이지 않는다', () => {
  expect(sourceNote('kbs')).toBe('출처: KBS 우리말 겨루기');
  expect(sourceNote('adapted')).toBeNull();
});

test('creditLines: 사전 출처·AI 그림 표시는 늘 밝히고, KBS 출처는 묶음에 kbs 문제가 있을 때만', () => {
  const dictLine = '뜻풀이: 국립국어원 표준국어대사전(CC BY-SA 2.0 KR)';
  const artLine = '그림·영상: AI 생성(Higgsfield)';
  expect(creditLines([{ source: 'adapted' }, { source: 'original' }])).toEqual([dictLine, artLine]);
  expect(creditLines([{ source: 'kbs' }])).toEqual([dictLine, artLine, '방송 기반 문제 출처: KBS 우리말 겨루기']);
});
