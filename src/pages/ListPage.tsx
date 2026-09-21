import { useMemo } from 'react';
import { PageHeader } from '../components/PageHeader';
import { StarDisplay } from '../components/StarRating';
import { formatDateShort, formatPrice, type Whisky } from '../model';
import { paths } from '../router';
import { STORAGE_LIMIT_CHARS, usedChars } from '../store';

export type SortKey = 'date' | 'rating' | 'price';
export type SortDir = 'asc' | 'desc';
export interface ListState {
  query: string;
  sortKey: SortKey;
  sortDir: SortDir;
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
  state: ListState;
  onStateChange: (s: ListState) => void;
  /** 詳細へ移る直前に呼ぶ(戻ったときにスクロール位置を復元するため) */
  onLeave: () => void;
}

export function ListPage({ whiskies, state, onStateChange, onLeave }: Props) {
  const { query, sortKey, sortDir } = state;
  const option = SORT_OPTIONS.find((o) => o.key === sortKey)!;

  const visible = useMemo(() => {
    const q = fold(query.trim());
    const filtered = q ? whiskies.filter((w) => fold(w.name).includes(q)) : whiskies;
    return sortWhiskies(filtered, sortKey, sortDir);
  }, [whiskies, query, sortKey, sortDir]);

  const usage = usedChars() / STORAGE_LIMIT_CHARS;

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
          </div>
        )}

        {whiskies.length === 0 ? (
          <div className="empty">
            <p className="empty-title">まだ記録がありません</p>
            <p>飲んだウイスキーの味・香り・感想を、1銘柄ずつ残しましょう。</p>
            <a className="btn btn-primary" href={`#${paths.new}`}>
              最初の1本を記録する
            </a>
          </div>
        ) : visible.length === 0 ? (
          <p className="empty">「{query.trim()}」に一致する銘柄はありません</p>
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
                        <span className="card-noimg" aria-hidden="true">
                          🥃
                        </span>
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

        {whiskies.length > 0 && (
          <p className={usage > 0.8 ? 'storage warn' : 'storage'}>
            保存容量 {Math.round(usage * 100)}% 使用
            {usage > 0.8 && '(いっぱいになると保存できなくなります。不要な写真を減らしてください)'}
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
