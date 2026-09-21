import { useState } from 'react';
import { LevelDisplay } from '../components/LevelGauge';
import { PageHeader } from '../components/PageHeader';
import { StarDisplay } from '../components/StarRating';
import { AROMA_AXES, TASTE_AXES, formatDate, formatPrice, type Whisky } from '../model';
import { navigate, paths } from '../router';
import { deleteWhisky } from '../store';

function Gallery({ photos, name }: { photos: string[]; name: string }) {
  const [index, setIndex] = useState(0);

  if (photos.length === 0) {
    return (
      <div className="gallery gallery-empty" aria-hidden="true">
        🥃
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

  function handleDelete() {
    if (!window.confirm(`「${w.name}」の記録を削除しますか?\nこの操作は元に戻せません。`)) return;
    const result = deleteWhisky(w.id);
    if (result.ok) navigate(paths.list, true);
    else setError('削除できませんでした。もう一度お試しください。');
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
          <h3 className="section-title">味の特徴</h3>
          {TASTE_AXES.map((a) => (
            <LevelDisplay key={a.key} label={a.label} value={w.taste[a.key]} />
          ))}
        </section>

        <section className="panel">
          <h3 className="section-title">香りの特徴</h3>
          {AROMA_AXES.map((a) => (
            <LevelDisplay key={a.key} label={a.label} value={w.aroma[a.key]} />
          ))}
        </section>

        <section className="panel">
          <h3 className="section-title">基本情報</h3>
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
          <h3 className="section-title">メモ</h3>
          {w.memo ? <p className="memo">{w.memo}</p> : <p className="hint">メモはありません</p>}
        </section>

        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button type="button" className="btn btn-danger btn-block" onClick={handleDelete}>
          この記録を削除
        </button>
      </main>
    </>
  );
}
