import type { ReactNode } from 'react';
import { GlassIcon } from './GlassIcon';

interface Props {
  title: string;
  /** 戻り先。省略すると戻るボタンを出さない(トップ画面) */
  backTo?: string;
  actions?: ReactNode;
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
        {backTo === undefined && <GlassIcon className="brand-mark" />}
        <span>{title}</span>
      </h1>
      <div className="header-actions">{actions}</div>
    </header>
  );
}
