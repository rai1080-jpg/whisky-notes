import { useMemo } from 'react';
import { PageHeader } from '../components/PageHeader';
import { SectionTitle } from '../components/SectionTitle';
import { BOTTLE_PHOTOS, BOTTLE_SHAPES } from '../bottles';
import { PRICE_BAND_LABELS } from '../catalog';
import { BottleArt } from '../components/BottleArt';
import { drinkStyleLabel, type DrinkStyleKey, type Whisky } from '../model';
import { paths } from '../router';
import { AXES, FAVORITE_THRESHOLD, axisLabel, recommend, type Recommendation } from '../recommend';

/** 好みの平均値(小数)を、3分割のバーと数値で表す */
function ProfileRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="level-row">
      <span className="level-label">{label}</span>
      <div
        className="level-bars"
        role="img"
        aria-label={`${label} 3段階中およそ${value.toFixed(1)}`}
      >
        {[1, 2, 3].map((n) => (
          <span key={n} className={n <= Math.round(value) ? 'bar on' : 'bar'} />
        ))}
      </div>
      <span className="level-text">{value.toFixed(1)}</span>
    </div>
  );
}

/** おすすめ1件分。左にボトル(写真か線画)、右に説明 */
function RecoCard({ rec, favoriteStyle }: { rec: Recommendation; favoriteStyle: DrinkStyleKey | null }) {
  const { item, score, matchedAxes, matchesStyle } = rec;
  const photo = BOTTLE_PHOTOS[item.id];
  return (
    <li className="reco-item">
      <div className="reco-media">
        {photo ? (
          <img
            src={`${import.meta.env.BASE_URL}${photo.src}`}
            alt={`${item.name} のボトル`}
            loading="lazy"
            style={photo.position ? { objectPosition: photo.position } : undefined}
          />
        ) : (
          <BottleArt shape={BOTTLE_SHAPES[item.id] ?? 'classic'} oak={item.aroma.oak} />
        )}
      </div>
      <div className="reco-body">
        <div className="reco-head">
          <h3 className="reco-name">{item.name}</h3>
          <span className="reco-score">{Math.round(score * 100)}%</span>
        </div>
        <p className="reco-meta">
          {item.category}・{item.region}・{PRICE_BAND_LABELS[item.price]}
        </p>
        <p className="reco-note">{item.note}</p>
        {matchedAxes.length > 0 && (
          <p className="reco-reason">
            {matchedAxes.map(axisLabel).join('と')}が好みに近い
            {matchesStyle && favoriteStyle ? `。${drinkStyleLabel(favoriteStyle)}にも向く` : ''}
          </p>
        )}
        <ul className="chip-row reco-styles">
          {item.styles.map((s) => (
            <li key={s}>
              <span className="chip chip-static">{drinkStyleLabel(s)}</span>
            </li>
          ))}
        </ul>
        {photo && (
          // 自由ライセンスの条件として、撮影者とライセンスを表示する
          <p className="reco-credit">
            写真:{' '}
            <a href={photo.page} target="_blank" rel="noopener noreferrer">
              {photo.author}
            </a>
            {' / '}
            {photo.licenseUrl ? (
              <a href={photo.licenseUrl} target="_blank" rel="noopener noreferrer">
                {photo.license}
              </a>
            ) : (
              photo.license
            )}
            (Wikimedia Commons)
          </p>
        )}
      </div>
    </li>
  );
}

export function RecommendPage({ whiskies }: { whiskies: Whisky[] }) {
  const { favorites, profile, favoriteStyle, recommendations } = useMemo(
    () => recommend(whiskies),
    [whiskies],
  );

  const hasProfile = AXES.some((a) => profile[a.key] !== undefined);

  return (
    <>
      <PageHeader title="おすすめ" backTo={paths.list} />
      <main className="page detail">
        {favorites.length === 0 || !hasProfile ? (
          <div className="empty">
            <p className="empty-title">まだおすすめを出せません</p>
            <p>
              総合評価{FAVORITE_THRESHOLD}以上の記録と、味・香りの評価をもとに提案します。
              {favorites.length > 0 && !hasProfile
                ? '味と香りの項目が未入力のため、傾向を計算できませんでした。'
                : `総合評価${FAVORITE_THRESHOLD}以上の記録がまだありません。`}
            </p>
            <a className="btn btn-primary" href={`#${paths.list}`}>
              一覧に戻る
            </a>
          </div>
        ) : (
          <>
            <section className="panel">
              <SectionTitle en="Your Taste" ja="あなたの好み" />
              <p className="reco-lead">
                総合評価{FAVORITE_THRESHOLD}以上の{favorites.length}件から割り出した傾向です。
              </p>
              {AXES.map((a) =>
                profile[a.key] === undefined ? null : (
                  <ProfileRow key={a.key} label={a.label} value={profile[a.key] as number} />
                ),
              )}
              {favoriteStyle && (
                <p className="hint">
                  よく合う飲み方:<strong className="reco-style">{drinkStyleLabel(favoriteStyle)}</strong>
                </p>
              )}
            </section>

            <section className="panel">
              <SectionTitle en="For You" ja="好みに近い銘柄" />
              <ul className="reco-list">
                {recommendations.map((rec) => (
                  <RecoCard key={rec.item.id} rec={rec} favoriteStyle={favoriteStyle} />
                ))}
              </ul>
            </section>

            <p className="reco-disclaimer">
              銘柄の味・香りの数値は、一般に言われている特徴をもとにした目安です。
              公式の評価ではなく、ロットや熟成、感じ方によって変わります。
              価格帯もおおよその区分で、実際の価格は変動します。
              写真のラベルは撮影された時期のもので、現在の商品と異なる場合があります。
              写真の無い銘柄は、ボトルの形をイメージした絵で示しています。
            </p>
          </>
        )}
      </main>
    </>
  );
}
