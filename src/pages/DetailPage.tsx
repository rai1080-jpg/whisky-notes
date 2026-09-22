import { useState } from 'react';
import { GlassIcon } from '../components/GlassIcon';
import { LevelDisplay } from '../components/LevelGauge';
import { PageHeader } from '../components/PageHeader';
import { SectionTitle } from '../components/SectionTitle';
import { StarDisplay } from '../components/StarRating';
import {
  AROMA_AXES,
  TASTE_AXES,
  drinkStyleLabel,
  formatDate,
  formatPrice,
  sortDrinks,
  type Whisky,
} from '../model';
import { navigate, paths } from '../router';
import { deleteWhisky } from '../store';

function Gallery({ photos, name }: { photos: string[]; name: string }) {
  const [index, setIndex] = useState(0);

  if (photos.length === 0) {
    return (
      <div className="gallery-empty">
        <GlassIcon className="gallery-empty-icon" />
      </div>
    );
  }
  return (
    <div className="gallery-wrap">
      <div
        className="gallery"
        onScroll={(e) => {
          const el = e.currentTarget;
          setIndex(Math.round(el.scrollLeft / el.clientWidth));
        }}
      >
        {photos.map((src, i) => (
          <img key={i} src={src} alt={`${name} の写真 ${i + 1}`} />
        ))}
      </div>
      {photos.length > 1 && (
        <span className="gallery-count">
          {index + 1} / {photos.length}
        </span>
      )}
    </div>
  );
}

export function DetailPage({ whisky: w }: { whisky: Whisky }) {
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!window.confirm(`「${w.name}」の記録を削除しますか?\nこの操作は元に戻せません。`)) return;
    setDeleting(true);
    const result = await deleteWhisky(w.id);
    if (result.ok) {
      navigate(paths.list, true);
      return;
    }
    setDeleting(false);
    setError('削除できませんでした。もう一度お試しください。');
  }

  return (
    <>
      <PageHeader
        title="詳細"
        backTo={paths.list}
        actions={
          <a className="btn btn-small" href={`#${paths.edit(w.id)}`}>
            編集
          </a>
        }
      />
      <main className="page detail">
        <Gallery photos={w.photos} name={w.name} />

        <section className="panel">
          <h2 className="detail-name">{w.name}</h2>
          <StarDisplay value={w.rating} size="lg" />
        </section>

        <section className="panel">
          <SectionTitle en="TASTE" ja="味の特徴" level={3} />
          {TASTE_AXES.map((a) => (
            <LevelDisplay key={a.key} label={a.label} value={w.taste[a.key]} />
          ))}
        </section>

        <section className="panel">
          <SectionTitle en="AROMA" ja="香りの特徴" level={3} />
          {AROMA_AXES.map((a) => (
            <LevelDisplay key={a.key} label={a.label} value={w.aroma[a.key]} />
          ))}
        </section>

        <section className="panel">
          <SectionTitle en="SERVE" ja="飲み方別の記録" level={3} />
          {w.drinks.length === 0 ? (
            <p className="hint">飲み方の記録はありません</p>
          ) : (
            <ul className="serve-list">
              {sortDrinks(w.drinks).map((d) => (
                <li key={d.style} className="serve-item">
                  <div className="serve-head">
                    <span className="serve-name">{drinkStyleLabel(d.style)}</span>
                    <StarDisplay value={d.rating} size="sm" />
                  </div>
                  {d.memo && <p className="serve-memo">{d.memo}</p>}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="panel">
          <SectionTitle en="DETAILS" ja="基本情報" level={3} />
          <dl className="info">
            <dt>価格</dt>
            <dd>{formatPrice(w.price) || '—'}</dd>
            <dt>飲んだ場所</dt>
            <dd>{w.place || '—'}</dd>
            <dt>飲んだ日</dt>
            <dd>{formatDate(w.date) || '—'}</dd>
          </dl>
        </section>

        <section className="panel">
          <SectionTitle en="NOTES" ja="メモ" level={3} />
          {w.memo ? <p className="memo">{w.memo}</p> : <p className="hint">メモはありません</p>}
        </section>

        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button
          type="button"
          className="btn btn-danger btn-block"
          onClick={handleDelete}
          disabled={deleting}
        >
          {deleting ? '削除中…' : 'この記録を削除'}
        </button>
      </main>
    </>
  );
}
