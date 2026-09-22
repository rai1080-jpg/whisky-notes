interface Props {
  /** 付与するクラス名。大きさと色は CSS 側(currentColor)で決める */
  className?: string;
}

/** 線画のロックグラス。ヘッダーのブランドマークと、写真がない場合の代替表示に使う */
export function GlassIcon({ className }: Props) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M6 4h12l-3 16H9L6 4Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <path d="M7.4 11.4h9.2l-1.5 7.9H8.9L7.4 11.4Z" fill="currentColor" opacity="0.85" />
    </svg>
  );
}
