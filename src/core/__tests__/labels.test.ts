import { creditLines, sourceNote } from '../labels';

test('다시 만든(adapted) 문제에는 KBS 출처를 붙이지 않는다', () => {
  expect(sourceNote('kbs')).toBe('출처: KBS 우리말 겨루기');
  expect(sourceNote('adapted')).toBeNull();
});

test('creditLines: 사전 출처는 늘 밝히고, KBS 출처는 묶음에 kbs 문제가 있을 때만', () => {
  const dictLine = '뜻풀이: 국립국어원 표준국어대사전(CC BY-SA 2.0 KR)';
  expect(creditLines([{ source: 'adapted' }, { source: 'original' }])).toEqual([dictLine]);
  expect(creditLines([{ source: 'kbs' }])).toEqual([dictLine, '방송 기반 문제 출처: KBS 우리말 겨루기']);
});
