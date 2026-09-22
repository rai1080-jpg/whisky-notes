import type { Whisky } from './model';

/**
 * 記録の保存先を IndexedDB にしている。localStorage(約5MB)と違い、
 * 端末の空き容量に応じて数百MB〜数GBまで扱えるため、写真を多く残せる。
 */
const DB_NAME = 'whisky-notes';
const DB_VERSION = 1;
const STORE = 'whiskies';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('indexedDB is not available'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('indexedDB open failed'));
    req.onblocked = () => reject(new Error('indexedDB open blocked'));
  });
}

let dbPromise: Promise<IDBDatabase> | null = null;
const getDb = (): Promise<IDBDatabase> => (dbPromise ??= openDb());

function run<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return getDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const req = fn(tx.objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error ?? new Error('indexedDB request failed'));
      }),
  );
}

export const idbGetAll = (): Promise<unknown[]> => run('readonly', (s) => s.getAll());
export const idbPut = (w: Whisky): Promise<void> =>
  run('readwrite', (s) => s.put(w)).then(() => undefined);
export const idbDelete = (id: string): Promise<void> =>
  run('readwrite', (s) => s.delete(id)).then(() => undefined);
