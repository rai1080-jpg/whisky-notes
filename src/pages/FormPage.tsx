import { useMemo, useRef, useState, type FormEvent } from 'react';
import { DrinkStyleEditor } from '../components/DrinkStyleEditor';
import { LevelInput } from '../components/LevelGauge';
import { PageHeader } from '../components/PageHeader';
import { PhotoPicker } from '../components/PhotoPicker';
import { SectionTitle } from '../components/SectionTitle';
import { StarInput } from '../components/StarRating';
import {
  AROMA_AXES,
  TASTE_AXES,
  emptyAroma,
  emptyTaste,
  newId,
  sortDrinks,
  todayLocal,
  type Aroma,
  type DrinkRecord,
  type Level,
  type Stars,
  type Taste,
  type Whisky,
} from '../model';
import { navigate, paths } from '../router';
import { upsertWhisky } from '../store';

/** 価格は入力途中の文字列で持ち、保存時に数値へ変換する */
interface Draft {
  name: string;
  photos: string[];
  taste: Taste;
  aroma: Aroma;
  drinks: DrinkRecord[];
  price: string;
  place: string;
  date: string;
  rating: Stars;
  memo: string;
}

function toDraft(w: Whisky | undefined): Draft {
  if (!w) {
    return {
      name: '',
      photos: [],
      taste: emptyTaste(),
      aroma: emptyAroma(),
      drinks: [],
      price: '',
      place: '',
      date: todayLocal(),
      rating: 0,
      memo: '',
    };
  }
  return {
    name: w.name,
    photos: w.photos,
    taste: w.taste,
    aroma: w.aroma,
    drinks: w.drinks,
    price: w.price === null ? '' : String(w.price),
    place: w.place,
    date: w.date,
    rating: w.rating,
    memo: w.memo,
  };
}

interface Props {
  /** 編集時のみ渡す。新規登録は undefined */
  whisky?: Whisky;
  /** 「飲んだ場所」の入力候補にする、これまでに登録した場所 */
  knownPlaces: string[];
}

export function FormPage({ whisky, knownPlaces }: Props) {
  const [draft, setDraft] = useState(() => toDraft(whisky));
  const [nameError, setNameError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const isEdit = whisky !== undefined;
  const backTo = isEdit ? paths.detail(whisky.id) : paths.list;

  const places = useMemo(() => [...new Set(knownPlaces.filter(Boolean))], [knownPlaces]);

  // 連続タップでも取りこぼさないよう、いずれも直前の state を元に更新する
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));
  const setTaste = (key: keyof Taste, v: Level) =>
    setDraft((d) => ({ ...d, taste: { ...d.taste, [key]: v } }));
  const setAroma = (key: keyof Aroma, v: Level) =>
    setDraft((d) => ({ ...d, aroma: { ...d.aroma, [key]: v } }));

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const name = draft.name.trim();
    if (!name) {
      setNameError('銘柄名を入力してください');
      nameRef.current?.focus();
      return;
    }

    const priceNum = draft.price.trim() === '' ? NaN : Number(draft.price);
    const now = Date.now();
    const record: Whisky = {
      id: whisky?.id ?? newId(),
      name,
      photos: draft.photos,
      taste: draft.taste,
      aroma: draft.aroma,
      drinks: sortDrinks(draft.drinks).map((d) => ({ ...d, memo: d.memo.trim() })),
      price: Number.isFinite(priceNum) && priceNum >= 0 ? Math.round(priceNum) : null,
      place: draft.place.trim(),
      date: draft.date,
      rating: draft.rating,
      memo: draft.memo.trim(),
      createdAt: whisky?.createdAt ?? now,
      updatedAt: now,
    };

    setSaving(true);
    setSaveError('');
    const result = await upsertWhisky(record);
    if (result.ok) {
      navigate(paths.detail(record.id), true);
      return;
    }
    setSaving(false);
    if (result.reason === 'quota') {
      setSaveError('保存容量がいっぱいで保存できませんでした。写真を減らすか、不要な記録を削除してください。');
    } else {
      setSaveError('保存できませんでした。ブラウザの設定(プライベートモード等)をご確認ください。');
    }
  }

  return (
    <>
      <PageHeader title={isEdit ? '記録を編集' : '新しい記録'} backTo={backTo} />
      <form className="page form" onSubmit={handleSubmit} noValidate>
        <section className="panel">
          <label className="label" htmlFor="name">
            銘柄名 <span className="required">必須</span>
          </label>
          <input
            id="name"
            ref={nameRef}
            className="field"
            type="text"
            placeholder="例:ラフロイグ 10年"
            autoComplete="off"
            value={draft.name}
            aria-invalid={nameError ? true : undefined}
            aria-describedby={nameError ? 'name-error' : undefined}
            onChange={(e) => {
              set('name', e.target.value);
              if (nameError) setNameError('');
            }}
          />
          {nameError && (
            <p id="name-error" className="error" role="alert">
              {nameError}
            </p>
          )}
        </section>

        <section className="panel">
          <SectionTitle en="PHOTOS" ja="ボトル写真" />
          <PhotoPicker photos={draft.photos} onChange={(p) => set('photos', p)} />
        </section>

        <section className="panel">
          <SectionTitle en="TASTE" ja="味の特徴" />
          {TASTE_AXES.map((a) => (
            <LevelInput
              key={a.key}
              label={a.label}
              value={draft.taste[a.key]}
              onChange={(v) => setTaste(a.key, v)}
            />
          ))}
          <p className="hint">選んだ段階をもう一度タップすると未評価に戻ります</p>
        </section>

        <section className="panel">
          <SectionTitle en="AROMA" ja="香りの特徴" />
          {AROMA_AXES.map((a) => (
            <LevelInput
              key={a.key}
              label={a.label}
              value={draft.aroma[a.key]}
              onChange={(v) => setAroma(a.key, v)}
            />
          ))}
        </section>

        <section className="panel">
          <SectionTitle en="SERVE" ja="飲み方別の記録" />
          <DrinkStyleEditor
            drinks={draft.drinks}
            onChange={(update) => setDraft((d) => ({ ...d, drinks: update(d.drinks) }))}
          />
        </section>

        <section className="panel">
          <SectionTitle en="RATING" ja="総合評価" />
          <StarInput value={draft.rating} onChange={(v) => set('rating', v)} label="総合評価" />
        </section>

        <section className="panel">
          <SectionTitle en="DETAILS" ja="飲んだときの情報" />

          <label className="label" htmlFor="price">
            価格
          </label>
          <div className="input-suffix">
            <input
              id="price"
              className="field"
              type="number"
              inputMode="numeric"
              min="0"
              step="1"
              placeholder="例:6000"
              value={draft.price}
              onChange={(e) => set('price', e.target.value)}
            />
            <span>円</span>
          </div>

          <label className="label" htmlFor="place">
            飲んだ場所
          </label>
          <input
            id="place"
            className="field"
            type="text"
            placeholder="店名 / 自宅 など"
            list="known-places"
            autoComplete="off"
            value={draft.place}
            onChange={(e) => set('place', e.target.value)}
          />
          <datalist id="known-places">
            {places.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>

          <label className="label" htmlFor="date">
            飲んだ日
          </label>
          <input
            id="date"
            className="field"
            type="date"
            value={draft.date}
            onChange={(e) => set('date', e.target.value)}
          />
        </section>

        <section className="panel">
          <SectionTitle en="NOTES" ja="メモ" />
          <textarea
            id="memo"
            className="field"
            rows={5}
            placeholder="第一印象、余韻、合わせた料理など"
            aria-label="メモ"
            value={draft.memo}
            onChange={(e) => set('memo', e.target.value)}
          />
        </section>

        {saveError && (
          <p className="error" role="alert">
            {saveError}
          </p>
        )}

        <div className="action-bar">
          <a className="btn" href={`#${backTo}`}>
            キャンセル
          </a>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? '保存中…' : '保存する'}
          </button>
        </div>
      </form>
    </>
  );
}
