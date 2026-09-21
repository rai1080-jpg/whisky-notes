import type { Stars } from '../model';

const STAR_PATH =
  'M12 2.5l2.94 6.1 6.66.9-4.9 4.6 1.25 6.6L12 17.5l-5.95 3.2 1.25-6.6-4.9-4.6 6.66-.9z';

function Star({ on }: { on: boolean }) {
  return (
    <svg className={on ? 'star on' : 'star'} viewBox="0 0 24 24" aria-hidden="true">
      <path d={STAR_PATH} />
    </svg>
  );
}

interface DisplayProps {
  value: number;
  size?: 'sm' | 'md' | 'lg';
}

/** 表示専用の星 */
export function StarDisplay({ value, size = 'md' }: DisplayProps) {
  if (value === 0) {
    return <span className="unrated">未評価</span>;
  }
  return (
    <span className={`stars stars-${size}`} role="img" aria-label={`5段階中${value}`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} on={n <= value} />
      ))}
    </span>
  );
}

interface InputProps {
  value: Stars;
  onChange: (v: Stars) => void;
  label: string;
}

/** タップで入力する星。同じ星をもう一度タップすると未評価に戻る */
export function StarInput({ value, onChange, label }: InputProps) {
  return (
    <div className="star-input" role="group" aria-label={label}>
      {([1, 2, 3, 4, 5] as const).map((n) => (
        <button
          key={n}
          type="button"
          className="star-btn"
          aria-label={`${n}つ星`}
          aria-pressed={n <= value}
          onClick={() => onChange(n === value ? 0 : n)}
        >
          <Star on={n <= value} />
        </button>
      ))}
      <span className="star-value" aria-hidden="true">
        {value === 0 ? '未評価' : `${value} / 5`}
      </span>
    </div>
  );
}
