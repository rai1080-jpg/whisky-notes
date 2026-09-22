import type { ReactNode } from 'react';

interface Props {
  title: string;
  /** 戻り先。省略すると戻るボタンを出さない(トップ画面) */
  backTo?: string;
  actions?: ReactNode;
}

/** アプリアイコンと同じ形の、琥珀色のロックグラス。トップ画面のブランドマーク */
function GlassMark() {
  return (
    <svg className="brand-mark" viewBox="0 0 24 24" aria-hidden="true">
      <defs>
        <linearGradient id="glass-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--amber-bright)" />
          <stop offset="100%" stopColor="var(--amber-deep)" />
        </linearGradient>
      </defs>
      <path d="M5.5 3h13l-1.7 15.2a2 2 0 0 1-2 1.8H9.2a2 2 0 0 1-2-1.8L5.5 3z" className="glass-outline" />
      <path d="M6.6 11.5h10.8l-.9 7.7a1 1 0 0 1-1 .9H8.5a1 1 0 0 1-1-.9l-.9-7.7z" fill="url(#glass-fill)" />
    </svg>
  );
}

export function PageHeader({ title, backTo, actions }: Props) {
  return (
    <header className="app-header">
      {backTo !== undefined && (
        <a className="icon-btn" href={`#${backTo}`} aria-label="戻る">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </a>
      )}
      <h1 className="app-title">
        {backTo === undefined && <GlassMark />}
        <span>{title}</span>
      </h1>
      <div className="header-actions">{actions}</div>
    </header>
  );
}
