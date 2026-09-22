import { useEffect, useMemo, useState } from 'react';
import { GlassIcon } from '../components/GlassIcon';
import { PageHeader } from '../components/PageHeader';
import { StarDisplay } from '../components/StarRating';
import { DRINK_STYLES, formatDateShort, formatPrice, type DrinkStyleKey, type Whisky } from '../model';
import { paths } from '../router';
import { formatBytes, getStorageInfo, type StorageInfo } from '../storageInfo';

export type SortKey = 'date' | 'rating' | 'price';
export type SortDir = 'asc' | 'desc';
export interface ListState {
  query: string;
  sortKey: SortKey;
  sortDir: SortDir;
  /** 'all' なら絞り込みなし */
  drinkStyle: DrinkStyleKey | 'all';
}

const SORT_OPTIONS: { key: SortKey; label: string; desc: string; asc: string }[] = [
  { key: 'date', label: '日付順', desc: '新しい順', asc: '古い順' },
  { key: 'rating', label: '評価順', desc: '高い順', asc: '低い順' },
  { key: 'price', label: '価格順', desc: '高い順', asc: '安い順' },
];

/** 全角/半角・大文字/小文字の違いを吸収して検索できるようにする */
const fold = (s: string) => s.normalize('NFKC').toLowerCase();

/** 並び替えに使う値。未入力(null)は昇順・降順どちらでも末尾に回す */
function sortValue(w: Whisky, key: SortKey): number | null {
  switch (key) {
    case 'date':
      return w.date ? Number(w.date.replace(/-/g, '')) : null;
    case 'rating':
      return w.rating || null;
    case 'price':
      return w.price;
  }
}

function sortWhiskies(list: Whisky[], key: SortKey, dir: SortDir): Whisky[] {
  return [...list].sort((a, b) => {
    const va = sortValue(a, key);
    const vb = sortValue(b, key);
    if (va === null && vb === null) return b.createdAt - a.createdAt;
    if (va === null) return 1;
    if (vb === null) return -1;
    if (va !== vb) return dir === 'asc' ? va - vb : vb - va;
    return b.createdAt - a.createdAt;
  });
}

interface Props {
  whiskies: Whisky[];
  /** 初回読み込み中(IndexedDB からの取得待ち)かどうか */
  ready: boolean;
  state: ListState;
  onStateChange: (s: ListState) => void;
  /** 詳細へ移る直前に呼ぶ(戻ったときにスクロール位置を復元するため) */
  onLeave: () => void;
}

export function ListPage({ whiskies, ready, state, onStateChange, onLeave }: Props) {
  const { query, sortKey, sortDir, drinkStyle } = state;
  const option = SORT_OPTIONS.find((o) => o.key === sortKey)!;

  const visible = useMemo(() => {
    const q = fold(query.trim());
    let filtered = q ? whiskies.filter((w) => fold(w.name).includes(q)) : whiskies;
    if (drinkStyle !== 'all') {
      filtered = filtered.filter((w) => w.drinks.some((d) => d.style === drinkStyle));
    }
    return sortWhiskies(filtered, sortKey, sortDir);
  }, [whiskies, query, sortKey, sortDir, drinkStyle]);

  // 飲み方の絞り込みは、実際に記録がある飲み方だけを出す
  const availableStyles = useMemo(
    () => DRINK_STYLES.filter((s) => whiskies.some((w) => w.drinks.some((d) => d.style === s.key))),
    [whiskies],
  );

  const [storage, setStorage] = useState<StorageInfo | null>(null);
  useEffect(() => {
    let cancelled = false;
    getStorageInfo().then((info) => {
      if (!cancelled) setStorage(info);
    });
    return () => {
      cancelled = true;
    };
  }, [whiskies.length]);
  const usagePct =
    storage?.usageBytes != null && storage.quotaBytes ? storage.usageBytes / storage.quotaBytes : null;

  return (
    <>
      <PageHeader title="ウイスキーノート" />
      <main className="page">
        {whiskies.length > 0 && (
          <div className="toolbar">
            <input
              className="field search"
              type="search"
              placeholder="銘柄名で検索"
              aria-label="銘柄名で検索"
              value={query}
              onChange={(e) => onStateChange({ ...state, query: e.target.value })}
            />
            <div className="sort-row">
              <select
                className="field"
                aria-label="並び替え"
                value={sortKey}
                onChange={(e) => onStateChange({ ...state, sortKey: e.target.value as SortKey })}
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.key} value={o.key}>
                    {o.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="btn sort-dir"
                onClick={() =>
                  onStateChange({ ...state, sortDir: sortDir === 'desc' ? 'asc' : 'desc' })
                }
              >
                {sortDir === 'desc' ? '↓' : '↑'} {sortDir === 'desc' ? option.desc : option.asc}
              </button>
            </div>

            {availableStyles.length > 0 && (
              <ul className="chip-row" role="group" aria-label="飲み方で絞り込む">
                <li>
                  <button
                    type="button"
                    className={drinkStyle === 'all' ? 'chip on' : 'chip'}
                    aria-pressed={drinkStyle === 'all'}
                    onClick={() => onStateChange({ ...state, drinkStyle: 'all' })}
                  >
                    すべて
                  </button>
                </li>
                {availableStyles.map((s) => (
                  <li key={s.key}>
                    <button
                      type="button"
                      className={drinkStyle === s.key ? 'chip on' : 'chip'}
                      aria-pressed={drinkStyle === s.key}
                      onClick={() => onStateChange({ ...state, drinkStyle: s.key })}
                    >
                      {s.label}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {!ready ? null : whiskies.length === 0 ? (
          <div className="empty">
            <p className="empty-title">まだ記録がありません</p>
            <p>飲んだウイスキーの味・香り・感想を、1銘柄ずつ残しましょう。</p>
            <a className="btn btn-primary" href={`#${paths.new}`}>
              最初の1本を記録する
            </a>
          </div>
        ) : visible.length === 0 ? (
          <p className="empty">条件に一致する銘柄はありません</p>
        ) : (
          <>
            <p className="count">{visible.length}件</p>
            <ul className="card-grid">
              {visible.map((w) => (
                <li key={w.id}>
                  <a className="card" href={`#${paths.detail(w.id)}`} onClick={onLeave}>
                    <div className="card-photo">
                      {w.photos[0] ? (
                        <img src={w.photos[0]} alt="" loading="lazy" />
                      ) : (
                        <GlassIcon className="card-noimg" />
                      )}
                    </div>
                    <div className="card-body">
                      <h2 className="card-name">{w.name}</h2>
                      <StarDisplay value={w.rating} size="sm" />
                      <p className="card-meta">
                        {[formatDateShort(w.date), formatPrice(w.price)]
                          .filter(Boolean)
                          .join(' ・ ') || ' '}
                      </p>
                    </div>
                  </a>
                </li>
              ))}
            </ul>
          </>
        )}

        {whiskies.length > 0 && storage?.usageBytes != null && (
          <p className={usagePct !== null && usagePct > 0.8 ? 'storage warn' : 'storage'}>
            保存容量 {formatBytes(storage.usageBytes)}
            {storage.quotaBytes ? ` / ${formatBytes(storage.quotaBytes)} 使用` : ' 使用'}
            {usagePct !== null &&
              usagePct > 0.8 &&
              '(いっぱいに近づいています。不要な写真を減らしてください)'}
          </p>
        )}
      </main>

      <a className="fab" href={`#${paths.new}`} onClick={onLeave} aria-label="新しく記録する">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </a>
    </>
  );
}
