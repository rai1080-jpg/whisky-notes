interface Props {
  href: string;
  label: string;
  onClick?: () => void;
}

/** 塗りの丸に細い矢印、その横に文字。誌面風の「続きへ」リンク */
export function ArrowLink({ href, label, onClick }: Props) {
  return (
    <a className="arrow-link" href={href} onClick={onClick}>
      <span className="arrow-circle" aria-hidden="true">
        <svg viewBox="0 0 24 24">
          <path d="M5 12h14M13.5 6.5 19 12l-5.5 5.5" />
        </svg>
      </span>
      <span className="arrow-label">{label}</span>
    </a>
  );
}
