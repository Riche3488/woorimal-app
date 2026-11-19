// 문제 묶음: 앱에 내장한 assets/pack.json과, 내려받아 둔 최신 묶음(문서 폴더) 중 하나를 쓴다.
import { File, Paths } from 'expo-file-system';
import { PACK_BASE_URL, choosePack, parsePack } from '../core/pack';
import type { AppPack } from '../core/types';

export type PackCache = { read(): Promise<string | null>; write(text: string): Promise<void> };

type FetchFn = (url: string) => Promise<Response>;

// 임시 파일에 다 쓴 뒤 이름을 바꿔, 쓰다 끊겨도 기존 캐시가 깨지지 않게 한다.
export const fileCache: PackCache = {
  async read() {
    const file = new File(Paths.document, 'pack.json');
    return file.exists ? file.text() : null;
  },
  async write(text) {
    const tmp = new File(Paths.document, 'pack.json.tmp');
    if (tmp.exists) tmp.delete();
    tmp.create();
    await tmp.write(text);
    const target = new File(Paths.document, 'pack.json');
    if (target.exists) target.delete();
    await tmp.move(target);
  },
};

export async function loadPack(cache: PackCache = fileCache): Promise<AppPack> {
  const bundled = parsePack(require('../../assets/pack.json'));
  if (!bundled) throw new Error('내장 문제 묶음(assets/pack.json)이 올바르지 않습니다');
  let cached: AppPack | null = null;
  try {
    const text = await cache.read();
    cached = text ? parsePack(JSON.parse(text)) : null;
  } catch {
    cached = null;
  }
  return choosePack(bundled, cached);
}

export async function refreshPack(current: AppPack, fetchFn: FetchFn = fetch, cache: PackCache = fileCache): Promise<AppPack | null> {
  try {
    const head = await fetchFn(`${PACK_BASE_URL}version.json`);
    if (!head.ok) return null;
    const info = await head.json();
    if (info?.schema !== 1 || typeof info.version !== 'string' || info.version === current.version) return null;
    const res = await fetchFn(`${PACK_BASE_URL}pack.json`);
    if (!res.ok) return null;
    const text = await res.text();
    const next = parsePack(JSON.parse(text));
    if (!next) return null;
    await cache.write(text);
    return next;
  } catch {
    return null;
  }
}
