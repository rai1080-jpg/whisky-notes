import { CATALOG, type CatalogItem } from './catalog';
import {
  AROMA_AXES,
  TASTE_AXES,
  type Aroma,
  type DrinkStyleKey,
  type Taste,
  type Whisky,
} from './model';

/** おすすめの根拠にする最低評価 */
export const FAVORITE_THRESHOLD = 4;
const MAX_RESULTS = 6;

export type AxisKey = keyof Taste | keyof Aroma;

export const AXES: { key: AxisKey; label: string; group: 'taste' | 'aroma' }[] = [
  ...TASTE_AXES.map((a) => ({ key: a.key as AxisKey, label: a.label, group: 'taste' as const })),
  ...AROMA_AXES.map((a) => ({ key: a.key as AxisKey, label: a.label, group: 'aroma' as const })),
];

const axisValue = (w: Whisky | CatalogItem, key: AxisKey): number =>
  key === 'sweetness' || key === 'smokiness' || key === 'body'
    ? w.taste[key]
    : w.aroma[key];

/** 好みの傾向。値を入力していない軸は持たない */
export type Profile = Partial<Record<AxisKey, number>>;

export interface Recommendation {
  item: CatalogItem;
  /** 好みとの近さ(0〜1) */
  score: number;
  /** 特に近い軸(最大2つ) */
  matchedAxes: AxisKey[];
  /** よく飲む飲み方に合うか */
  matchesStyle: boolean;
}

export interface RecommendResult {
  /** 4★以上の記録 */
  favorites: Whisky[];
  profile: Profile;
  /** 4★以上の記録で最も評価が高かった飲み方 */
  favoriteStyle: DrinkStyleKey | null;
  recommendations: Recommendation[];
}

/** 4★以上の記録から、軸ごとの平均値(1〜3)を出す。未評価(0)は平均に入れない */
function buildProfile(favorites: Whisky[]): Profile {
  const profile: Profile = {};
  for (const { key } of AXES) {
    const values = favorites.map((w) => axisValue(w, key)).filter((v) => v > 0);
    if (values.length > 0) {
      profile[key] = values.reduce((a, b) => a + b, 0) / values.length;
    }
  }
  return profile;
}

/** 4★以上の記録の中で、飲み方ごとの評価が最も高いものを選ぶ(同点なら記録数が多い方) */
function findFavoriteStyle(favorites: Whisky[]): DrinkStyleKey | null {
  const stats = new Map<DrinkStyleKey, { total: number; count: number }>();
  for (const w of favorites) {
    for (const d of w.drinks) {
      if (d.rating === 0) continue;
      const s = stats.get(d.style) ?? { total: 0, count: 0 };
      s.total += d.rating;
      s.count += 1;
      stats.set(d.style, s);
    }
  }
  let best: { style: DrinkStyleKey; avg: number; count: number } | null = null;
  for (const [style, { total, count }] of stats) {
    const avg = total / count;
    if (!best || avg > best.avg || (avg === best.avg && count > best.count)) {
      best = { style, avg, count };
    }
  }
  return best?.style ?? null;
}

/** 表記ゆれを吸収して比較するためのキー */
const fold = (s: string) => s.normalize('NFKC').toLowerCase().replace(/[\s・,，.。]/g, '');

/** すでに登録済みの銘柄はおすすめから外す(部分一致で判定) */
function isAlreadyOwned(item: CatalogItem, whiskies: Whisky[]): boolean {
  const target = fold(item.name);
  return whiskies.some((w) => {
    const owned = fold(w.name);
    if (owned.length < 3) return false; // 短すぎる名前での誤判定を避ける
    return target.includes(owned) || owned.includes(target);
  });
}

export function recommend(whiskies: Whisky[]): RecommendResult {
  const favorites = whiskies.filter((w) => w.rating >= FAVORITE_THRESHOLD);
  const profile = buildProfile(favorites);
  const favoriteStyle = findFavoriteStyle(favorites);
  const keys = AXES.map((a) => a.key).filter((k) => profile[k] !== undefined);

  if (favorites.length === 0 || keys.length === 0) {
    return { favorites, profile, favoriteStyle, recommendations: [] };
  }

  const scored = CATALOG.filter((item) => !isAlreadyOwned(item, whiskies)).map((item) => {
    const diffs = keys.map((k) => Math.abs(axisValue(item, k) - (profile[k] as number)));
    // 二乗平均で距離を出す。1軸だけ大きく外れる銘柄を上位に出さないため
    const rms = Math.sqrt(diffs.reduce((a, d) => a + d * d, 0) / diffs.length);
    const base = 1 - rms / 2; // 軸の幅は 1〜3 なので最大の差は 2

    const matchesStyle = favoriteStyle !== null && item.styles.includes(favoriteStyle);
    const score = Math.max(0, Math.min(1, base + (matchesStyle ? 0.04 : 0)));

    // 差が小さく、かつ好みがはっきりしている(平均1.8以上)軸を「近い点」として挙げる
    const matchedAxes = keys
      .map((k, i) => ({ key: k, diff: diffs[i], value: profile[k] as number }))
      .filter((a) => a.diff <= 0.6 && a.value >= 1.8)
      .sort((a, b) => a.diff - b.diff)
      .slice(0, 2)
      .map((a) => a.key);

    return { item, score, matchedAxes, matchesStyle };
  });

  const recommendations = scored
    .sort((a, b) => b.score - a.score || a.item.name.localeCompare(b.item.name, 'ja'))
    .slice(0, MAX_RESULTS);

  return { favorites, profile, favoriteStyle, recommendations };
}

export const axisLabel = (key: AxisKey): string => AXES.find((a) => a.key === key)?.label ?? '';
