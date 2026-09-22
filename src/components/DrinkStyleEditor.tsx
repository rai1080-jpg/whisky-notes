import { DRINK_STYLES, sortDrinks, type DrinkRecord, type DrinkStyleKey } from '../model';
import { StarInput } from './StarRating';

interface Props {
  drinks: DrinkRecord[];
  /**
   * 直前の値を受け取って新しい配列を返す形にしている。
   * 星をタップした直後にメモを打つなど、再描画を挟まずに続けて編集しても
   * 先の変更が消えないようにするため。
   */
  onChange: (update: (prev: DrinkRecord[]) => DrinkRecord[]) => void;
}

/** 飲み方を選ぶと、その飲み方ごとに評価とメモを入力できる */
export function DrinkStyleEditor({ drinks, onChange }: Props) {
  const has = (key: DrinkStyleKey) => drinks.some((d) => d.style === key);

  const toggle = (key: DrinkStyleKey) =>
    onChange((prev) =>
      prev.some((d) => d.style === key)
        ? prev.filter((d) => d.style !== key)
        : [...prev, { style: key, rating: 0, memo: '' }],
    );

  const update = (key: DrinkStyleKey, patch: Partial<DrinkRecord>) =>
    onChange((prev) => prev.map((d) => (d.style === key ? { ...d, ...patch } : d)));

  const selected = sortDrinks(drinks);

  return (
    <div>
      <ul className="chip-row" role="group" aria-label="飲み方を選ぶ">
        {DRINK_STYLES.map((s) => (
          <li key={s.key}>
            <button
              type="button"
              className={has(s.key) ? 'chip on' : 'chip'}
              aria-pressed={has(s.key)}
              onClick={() => toggle(s.key)}
            >
              {s.label}
            </button>
          </li>
        ))}
      </ul>

      {selected.length === 0 ? (
        <p className="hint">試した飲み方を選ぶと、飲み方ごとに評価とメモを残せます</p>
      ) : (
        <ul className="serve-edit-list">
          {selected.map((d) => {
            const label = DRINK_STYLES.find((s) => s.key === d.style)!.label;
            return (
              <li key={d.style} className="serve-edit">
                <div className="serve-edit-head">
                  <span className="serve-name">{label}</span>
                  <button
                    type="button"
                    className="serve-remove"
                    aria-label={`${label}の記録を削除`}
                    onClick={() => toggle(d.style)}
                  >
                    ×
                  </button>
                </div>
                <StarInput
                  value={d.rating}
                  onChange={(rating) => update(d.style, { rating })}
                  label={`${label}の評価`}
                />
                <textarea
                  className="field"
                  rows={2}
                  placeholder={`${label}で飲んだときの感想`}
                  aria-label={`${label}のメモ`}
                  value={d.memo}
                  onChange={(e) => update(d.style, { memo: e.target.value })}
                />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
