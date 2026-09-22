/** 3段階評価。0 は「未評価」 */
export type Level = 0 | 1 | 2 | 3;
/** 5段階の星。0 は「未評価」 */
export type Stars = 0 | 1 | 2 | 3 | 4 | 5;

export interface Taste {
  sweetness: Level;
  smokiness: Level;
  body: Level;
}

export interface Aroma {
  fruity: Level;
  spicy: Level;
  oak: Level;
}

export interface Whisky {
  id: string;
  name: string;
  /** 縮小・圧縮済みの JPEG data URL */
  photos: string[];
  taste: Taste;
  aroma: Aroma;
  price: number | null;
  place: string;
  /** YYYY-MM-DD(ローカル日付)。未入力は空文字 */
  date: string;
  rating: Stars;
  memo: string;
  createdAt: number;
  updatedAt: number;
}

export const TASTE_AXES: { key: keyof Taste; label: string }[] = [
  { key: 'sweetness', label: '甘さ' },
  { key: 'smokiness', label: 'スモーキーさ' },
  { key: 'body', label: 'コクの強さ' },
];

export const AROMA_AXES: { key: keyof Aroma; label: string }[] = [
  { key: 'fruity', label: 'フルーティさ' },
  { key: 'spicy', label: 'スパイシーさ' },
  { key: 'oak', label: '樽香の強さ' },
];

export const LEVEL_LABELS = ['弱め', 'ふつう', '強め'] as const;

/** 1銘柄あたりの写真の上限。保存先が IndexedDB になり容量に余裕ができたため増やしている */
export const MAX_PHOTOS = 10;

export const emptyTaste = (): Taste => ({ sweetness: 0, smokiness: 0, body: 0 });
export const emptyAroma = (): Aroma => ({ fruity: 0, spicy: 0, oak: 0 });

/** crypto.randomUUID は http(LAN 上の開発サーバ)では使えないため自前で生成する */
export const newId = (): string =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

/** ローカルタイムゾーンの今日(toISOString は UTC になるので使わない) */
export function todayLocal(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function formatDate(ymd: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  return m ? `${m[1]}年${Number(m[2])}月${Number(m[3])}日` : '';
}

/** カード用の短い表記(2026/9/21) */
export function formatDateShort(ymd: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  return m ? `${m[1]}/${Number(m[2])}/${Number(m[3])}` : '';
}

export const formatPrice = (price: number | null): string =>
  price === null ? '' : `¥${price.toLocaleString('ja-JP')}`;

// ---- localStorage から読んだ値の検証 ----

const asLevel = (v: unknown): Level => (v === 1 || v === 2 || v === 3 ? v : 0);
const asStars = (v: unknown): Stars =>
  v === 1 || v === 2 || v === 3 || v === 4 || v === 5 ? v : 0;
const asString = (v: unknown): string => (typeof v === 'string' ? v : '');
const asRecord = (v: unknown): Record<string, unknown> =>
  v && typeof v === 'object' ? (v as Record<string, unknown>) : {};

/** 壊れた/古い形式のデータでも落ちないように正規化する。名前が無いものは捨てる */
export function normalizeWhisky(raw: unknown): Whisky | null {
  const r = asRecord(raw);
  const name = asString(r.name).trim();
  if (!name) return null;
  const taste = asRecord(r.taste);
  const aroma = asRecord(r.aroma);
  const now = Date.now();
  return {
    id: asString(r.id) || newId(),
    name,
    photos: Array.isArray(r.photos)
      ? r.photos.filter((p): p is string => typeof p === 'string' && p.startsWith('data:image/'))
      : [],
    taste: {
      sweetness: asLevel(taste.sweetness),
      smokiness: asLevel(taste.smokiness),
      body: asLevel(taste.body),
    },
    aroma: {
      fruity: asLevel(aroma.fruity),
      spicy: asLevel(aroma.spicy),
      oak: asLevel(aroma.oak),
    },
    price: typeof r.price === 'number' && Number.isFinite(r.price) && r.price >= 0 ? r.price : null,
    place: asString(r.place),
    date: asString(r.date),
    rating: asStars(r.rating),
    memo: asString(r.memo),
    createdAt: typeof r.createdAt === 'number' ? r.createdAt : now,
    updatedAt: typeof r.updatedAt === 'number' ? r.updatedAt : now,
  };
}
