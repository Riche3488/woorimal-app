import { parsePack, choosePack, acceptUpdate, APP_PACK_COMPAT } from '../pack';
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

describe('parsePack 안전장치', () => {
  test('모르는 유형·출처, 겹치는 키는 거절', () => {
    const badType = makePack() as any; badType.questions[0].type = 'video';
    expect(parsePack(badType)).toBeNull();
    const badSource = makePack() as any; badSource.questions[0].source = 'unknown';
    expect(parsePack(badSource)).toBeNull();
    const adapted = makePack(); adapted.questions[0] = { ...adapted.questions[0], source: 'adapted' };
    expect(parsePack(adapted)).not.toBeNull();
    const dup = makePack(); dup.questions[1] = { ...dup.questions[1], key: dup.questions[0].key };
    expect(parsePack(dup)).toBeNull();
  });
  test('이 앱보다 새 앱이 필요한 묶음(minApp)은 거절', () => {
    expect(parsePack({ ...makePack(), minApp: APP_PACK_COMPAT })).not.toBeNull();
    expect(parsePack({ ...makePack(), minApp: APP_PACK_COMPAT + 1 })).toBeNull();
  });
});

const at = (version: string, generatedAt: string, n = 2): AppPack => {
  const p = makePack(version);
  const questions = Array.from({ length: n }, (_, i) => ({ ...p.questions[0], key: `spelling:${i}` }));
  return { ...p, generatedAt, questions };
};

describe('choosePack', () => {
  test('캐시가 없으면 내장', () => {
    const bundled = makePack('b');
    expect(choosePack(bundled, null)).toBe(bundled);
  });
  test('캐시가 내장보다 새것이면 캐시', () => {
    const bundled = at('b', '2026-11-19T00:00:00.000Z'), cached = at('c', '2026-11-20T00:00:00.000Z');
    expect(choosePack(bundled, cached)).toBe(cached);
  });
  test('앱 업데이트로 내장이 더 새것이면 내장', () => {
    const bundled = at('b', '2026-12-01T00:00:00.000Z'), cached = at('c', '2026-11-20T00:00:00.000Z');
    expect(choosePack(bundled, cached)).toBe(bundled);
  });
});

describe('acceptUpdate', () => {
  const current = at('a', '2026-11-19T00:00:00.000Z', 100);
  test('새것이고 크기가 비슷하면 받는다', () => {
    expect(acceptUpdate(current, at('b', '2026-11-20T00:00:00.000Z', 90))).toBe(true);
  });
  test('지금 것보다 오래된 묶음은 받지 않는다', () => {
    expect(acceptUpdate(current, at('b', '2026-11-18T00:00:00.000Z', 100))).toBe(false);
  });
  test('문제 수가 절반 아래로 줄면 받지 않는다(배포 실수 방지)', () => {
    expect(acceptUpdate(current, at('b', '2026-11-20T00:00:00.000Z', 49))).toBe(false);
  });
  test('웹이 shrink로 일부러 줄였다고 밝히면 받는다', () => {
    expect(acceptUpdate(current, { ...at('b', '2026-11-20T00:00:00.000Z', 49), shrink: true })).toBe(true);
  });
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
  test('version.json의 minApp이 이 앱보다 크면 pack.json을 받지 않는다', async () => {
    const cache = memoryCache();
    const fetchFn = jest.fn(async () => respond({ schema: 1, version: 'bbbbbbbbbbbb', url: 'pack.json', minApp: APP_PACK_COMPAT + 1 }));
    await expect(refreshPack(makePack(), fetchFn, cache)).resolves.toBeNull();
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });
  test('받은 묶음이 안전 검사에 걸리면 캐시에 쓰지 않는다', async () => {
    const cache = memoryCache();
    const next = { ...makePack('bbbbbbbbbbbb'), generatedAt: '2020-01-01T00:00:00.000Z' };
    const fetchFn = jest.fn()
      .mockResolvedValueOnce(respond({ schema: 1, version: 'bbbbbbbbbbbb', url: 'pack.json' }))
      .mockResolvedValueOnce(respond(next));
    await expect(refreshPack(makePack(), fetchFn, cache)).resolves.toBeNull();
    expect(cache.saved).toBeNull();
  });
  test('새 버전이 유효하면 캐시에 쓰고 돌려준다', async () => {
    const cache = memoryCache();
    const next = { ...makePack('bbbbbbbbbbbb'), generatedAt: '2026-11-20T00:00:00.000Z' };
    const fetchFn = jest.fn()
      .mockResolvedValueOnce(respond({ schema: 1, version: 'bbbbbbbbbbbb', url: 'pack.json' }))
      .mockResolvedValueOnce(respond(next));
    await expect(refreshPack(makePack(), fetchFn, cache)).resolves.toEqual(next);
    expect(JSON.parse(cache.saved!)).toEqual(next);
    expect(fetchFn.mock.calls[1][0]).toBe('https://woorimal-contest.co.kr/app/pack.json');
  });
});
