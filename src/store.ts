import { useSyncExternalStore } from 'react';
import { normalizeWhisky, type Whisky } from './model';

const KEY = 'whisky-notes:v1';
/** localStorage の一般的な上限(約5MB)。使用量の目安表示にだけ使う */
export const STORAGE_LIMIT_CHARS = 5_000_000;

export type SaveResult = { ok: true } | { ok: false; reason: 'quota' | 'unknown' };

function read(): Whisky[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeWhisky).filter((w): w is Whisky => w !== null);
  } catch {
    return [];
  }
}

let cache: Whisky[] = read();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

// 別タブで更新された場合も追従する
window.addEventListener('storage', (e) => {
  if (e.key === KEY || e.key === null) {
    cache = read();
    emit();
  }
});

function persist(next: Whisky[]): SaveResult {
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch (e) {
    const quota =
      e instanceof DOMException && (e.name === 'QuotaExceededError' || e.code === 22);
    return { ok: false, reason: quota ? 'quota' : 'unknown' };
  }
  cache = next;
  emit();
  return { ok: true };
}

export function upsertWhisky(w: Whisky): SaveResult {
  const exists = cache.some((x) => x.id === w.id);
  return persist(exists ? cache.map((x) => (x.id === w.id ? w : x)) : [w, ...cache]);
}

export function deleteWhisky(id: string): SaveResult {
  return persist(cache.filter((x) => x.id !== id));
}

/** 保存データが使っている文字数(localStorage の容量はほぼ文字数で数えられる) */
export function usedChars(): number {
  try {
    return (localStorage.getItem(KEY) ?? '').length;
  } catch {
    return 0;
  }
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export const useWhiskies = (): Whisky[] => useSyncExternalStore(subscribe, () => cache);
