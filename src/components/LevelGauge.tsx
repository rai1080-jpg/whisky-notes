import { LEVEL_LABELS, type Level } from '../model';

interface InputProps {
  label: string;
  value: Level;
  onChange: (v: Level) => void;
}

/** 3分割のゲージ。タップした段階まで満たされる。選択中をもう一度タップで未評価に戻る */
export function LevelInput({ label, value, onChange }: InputProps) {
  return (
    <div className="level-row">
      <span className="level-label" id={`lv-${label}`}>
        {label}
      </span>
      <div className="level-gauge" role="group" aria-labelledby={`lv-${label}`}>
        {([1, 2, 3] as const).map((n) => (
          <button
            key={n}
            type="button"
            className={n <= value ? 'seg on' : 'seg'}
            aria-pressed={n === value}
            aria-label={`${label} ${LEVEL_LABELS[n - 1]}`}
            onClick={() => onChange(n === value ? 0 : n)}
          >
            {LEVEL_LABELS[n - 1]}
          </button>
        ))}
      </div>
    </div>
  );
}

/** 詳細画面用の表示専用ゲージ */
export function LevelDisplay({ label, value }: { label: string; value: Level }) {
  return (
    <div className="level-row">
      <span className="level-label">{label}</span>
      <div
        className="level-bars"
        role="img"
        aria-label={value === 0 ? `${label} 未評価` : `${label} 3段階中${value}`}
      >
        {[1, 2, 3].map((n) => (
          <span key={n} className={n <= value ? 'bar on' : 'bar'} />
        ))}
      </div>
      <span className="level-text">{value === 0 ? '—' : LEVEL_LABELS[value - 1]}</span>
    </div>
  );
}
