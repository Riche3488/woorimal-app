import { parsePack, choosePack } from '../pack';
import { refreshPack, type PackCache } from '../../data/pack-store';
import type { AppPack } from '../types';

const makePack = (version = 'aaaaaaaaaaaa'): AppPack => ({
  schema: 1, version, generatedAt: '2026-11-19T00:00:00.000Z', counts: { total: 2 },
  questions: [
    { key: 'spelling:1', type: 'spelling', kind: 'choice', prompt: 'p', answer: '설거지', explain: '', choices: ['설겆이', '설거지'], source: 'original', easy: true },
    { key: 'spacing:1', type: 'spacing', kind: 'spacing', prompt: 'p', answer: '할 수', explain: '', answers: ['할 수'], syllables: ['할', '수'], source: 'blog', easy: true },
  ],
});

describe('parsePack', () => {
  test('유효한 묶음은 그대로 돌려준다', () => {
    const pack = makePack();
    expect(parsePack(pack)).toEqual(pack);
  });
  test('형식이 틀리면 null', () => {
    expect(parsePack(null)).toBeNull();
    expect(parsePack({})).toBeNull();
    expect(parsePack({ ...makePack(), schema: 2 })).toBeNull();
    const badChoice = makePack();
    badChoice.questions[0] = { ...badChoice.questions[0], answer: '없는 보기' };
    expect(parsePack(badChoice)).toBeNull();
    const badSpacing = makePack();
    delete badSpacing.questions[1].syllables;
    expect(parsePack(badSpacing)).toBeNull();
    const noSource = makePack() as any;
    delete noSource.questions[0].source;
    expect(parsePack(noSource)).toBeNull();
  });
});

test('choosePack: 캐시가 있으면 캐시, 없으면 내장', () => {
  const bundled = makePack('b'), cached = makePack('c');
  expect(choosePack(bundled, null)).toBe(bundled);
  expect(choosePack(bundled, cached)).toBe(cached);
});

describe('refreshPack', () => {
  const memoryCache = (): PackCache & { saved: string | null } => {
    const c = { saved: null as string | null, read: async () => c.saved, write: async (t: string) => { c.saved = t; } };
    return c;
  };
  const respond = (body: unknown) => ({ ok: true, json: async () => body, text: async () => JSON.stringify(body) }) as unknown as Response;

  test('네트워크 오류면 null이고 캐시는 그대로', async () => {
    const cache = memoryCache();
    const fetchFn = jest.fn(async () => { throw new Error('offline'); });
    await expect(refreshPack(makePack(), fetchFn, cache)).resolves.toBeNull();
    expect(cache.saved).toBeNull();
  });
  test('같은 버전이면 pack.json을 받지 않는다', async () => {
    const cache = memoryCache();
    const fetchFn = jest.fn(async () => respond({ schema: 1, version: 'aaaaaaaaaaaa', url: 'pack.json' }));
    await expect(refreshPack(makePack('aaaaaaaaaaaa'), fetchFn, cache)).resolves.toBeNull();
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });
  test('새 버전이 깨져 있으면 null이고 캐시는 그대로', async () => {
    const cache = memoryCache();
    const fetchFn = jest.fn()
      .mockResolvedValueOnce(respond({ schema: 1, version: 'bbbbbbbbbbbb', url: 'pack.json' }))
      .mockResolvedValueOnce(respond({ schema: 1, version: 'bbbbbbbbbbbb', questions: 'broken' }));
    await expect(refreshPack(makePack(), fetchFn, cache)).resolves.toBeNull();
    expect(cache.saved).toBeNull();
  });
  test('새 버전이 유효하면 캐시에 쓰고 돌려준다', async () => {
    const cache = memoryCache();
    const next = makePack('bbbbbbbbbbbb');
    const fetchFn = jest.fn()
      .mockResolvedValueOnce(respond({ schema: 1, version: 'bbbbbbbbbbbb', url: 'pack.json' }))
      .mockResolvedValueOnce(respond(next));
    await expect(refreshPack(makePack(), fetchFn, cache)).resolves.toEqual(next);
    expect(JSON.parse(cache.saved!)).toEqual(next);
    expect(fetchFn.mock.calls[1][0]).toBe('https://woorimal-contest.co.kr/app/pack.json');
  });
});
