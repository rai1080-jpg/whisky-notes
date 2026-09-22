import { useSyncExternalStore } from 'react';
import { idbDelete, idbGetAll, idbPut } from './db';
import { normalizeWhisky, type Whisky } from './model';

/** 旧バージョン(localStorage 版)のキー。初回起動時にのみ読み、IndexedDB へ移す */
const LEGACY_KEY = 'whisky-notes:v1';

export type SaveResult =
  | { ok: true }
  | { ok: false; reason: 'quota' | 'unavailable' | 'unknown' };

let cache: Whisky[] = [];
/** 初回読み込み(IndexedDB は非同期)が終わったかどうか */
let ready = false;
/** IndexedDB が使えない環境(古いブラウザ・一部のプライベートモード)では localStorage に落とす */
let useIdb = true;

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function normalizeAll(rows: unknown[]): Whisky[] {
  return rows.map(normalizeWhisky).filter((w): w is Whisky => w !== null);
}

function readLegacyLocalStorage(): Whisky[] {
  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? normalizeAll(parsed) : [];
  } catch {
    return [];
  }
}

function persistLegacyLocalStorage(next: Whisky[]): SaveResult {
  try {
    localStorage.setItem(LEGACY_KEY, JSON.stringify(next));
  } catch (e) {
    const quota = e instanceof DOMException && (e.name === 'QuotaExceededError' || e.code === 22);
    return { ok: false, reason: quota ? 'quota' : 'unknown' };
  }
  return { ok: true };
}

// 別タブでの更新を反映する(IndexedDB は storage イベントを発火しないため BroadcastChannel を使う)
const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('whisky-notes') : null;
async function refreshFromIdb() {
  try {
    cache = normalizeAll(await idbGetAll());
    emit();
  } catch {
    /* 一時的な失敗は次の操作まで無視する */
  }
}
channel?.addEventListener('message', (e) => {
  if (e.data === 'changed' && useIdb) void refreshFromIdb();
});
// localStorage フォールバック時の別タブ追従
window.addEventListener('storage', (e) => {
  if (!useIdb && (e.key === LEGACY_KEY || e.key === null)) {
    cache = readLegacyLocalStorage();
    emit();
  }
});

async function init(): Promise<void> {
  try {
    const rows = await idbGetAll();
    const normalized = normalizeAll(rows);
    if (normalized.length === 0) {
      // IndexedDB が空なら、旧バージョンのデータが残っていないか確認して一度だけ取り込む
      const legacy = readLegacyLocalStorage();
      if (legacy.length > 0) {
        for (const w of legacy) await idbPut(w);
        try {
          localStorage.removeItem(LEGACY_KEY);
        } catch {
          /* 削除できなくても実害はない */
        }
        cache = legacy;
        useIdb = true;
        ready = true;
        emit();
        return;
      }
    }
    cache = normalized;
    useIdb = true;
  } catch {
    // IndexedDB 自体が使えない環境向けのフォールバック
    useIdb = false;
    cache = readLegacyLocalStorage();
  }
  ready = true;
  emit();
}
void init();

function isQuotaError(e: unknown): boolean {
  return e instanceof DOMException && (e.name === 'QuotaExceededError' || e.code === 22);
}

export async function upsertWhisky(w: Whisky): Promise<SaveResult> {
  const next = cache.some((x) => x.id === w.id) ? cache.map((x) => (x.id === w.id ? w : x)) : [w, ...cache];

  if (useIdb) {
    try {
      await idbPut(w);
    } catch (e) {
      return { ok: false, reason: isQuotaError(e) ? 'quota' : 'unknown' };
    }
    cache = next;
    emit();
    channel?.postMessage('changed');
    return { ok: true };
  }

  const result = persistLegacyLocalStorage(next);
  if (result.ok) {
    cache = next;
    emit();
  }
  return result;
}

export async function deleteWhisky(id: string): Promise<SaveResult> {
  const next = cache.filter((x) => x.id !== id);

  if (useIdb) {
    try {
      await idbDelete(id);
    } catch (e) {
      return { ok: false, reason: isQuotaError(e) ? 'quota' : 'unknown' };
    }
    cache = next;
    emit();
    channel?.postMessage('changed');
    return { ok: true };
  }

  const result = persistLegacyLocalStorage(next);
  if (result.ok) {
    cache = next;
    emit();
  }
  return result;
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export const useWhiskies = (): Whisky[] => useSyncExternalStore(subscribe, () => cache);
/** 初回読み込み中は「記録なし」と誤表示しないよう、一覧画面はこれで判定する */
export const useWhiskiesReady = (): boolean => useSyncExternalStore(subscribe, () => ready);
