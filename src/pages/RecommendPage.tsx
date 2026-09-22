import { useMemo } from 'react';
import { PageHeader } from '../components/PageHeader';
import { SectionTitle } from '../components/SectionTitle';
import { PRICE_BAND_LABELS } from '../catalog';
import { drinkStyleLabel, type Whisky } from '../model';
import { paths } from '../router';
import { AXES, FAVORITE_THRESHOLD, axisLabel, recommend } from '../recommend';

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
              <SectionTitle en="YOUR TASTE" ja="あなたの好み" />
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
              <SectionTitle en="FOR YOU" ja="好みに近い銘柄" />
              <ul className="reco-list">
                {recommendations.map(({ item, score, matchedAxes, matchesStyle }) => (
                  <li key={item.id} className="reco-item">
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
                        {matchesStyle && favoriteStyle
                          ? `。${drinkStyleLabel(favoriteStyle)}にも向く`
                          : ''}
                      </p>
                    )}
                    <ul className="chip-row reco-styles">
                      {item.styles.map((s) => (
                        <li key={s}>
                          <span className="chip chip-static">{drinkStyleLabel(s)}</span>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            </section>

            <p className="reco-disclaimer">
              銘柄の味・香りの数値は、一般に言われている特徴をもとにした目安です。
              公式の評価ではなく、ロットや熟成、感じ方によって変わります。
              価格帯もおおよその区分で、実際の価格は変動します。
            </p>
          </>
        )}
      </main>
    </>
  );
}
