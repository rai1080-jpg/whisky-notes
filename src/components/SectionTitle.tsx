interface Props {
  /** 英字の見出し(例: TASTE) */
  en: string;
  /** 和文の見出し(例: 味の特徴) */
  ja: string;
  /** 見出しレベル。詳細画面のように上位の見出しがある場合は 3 を使う */
  level?: 2 | 3;
}

/** 英字 + 和文 + 金の罫線。ブランドサイトのような節見出し */
export function SectionTitle({ en, ja, level = 2 }: Props) {
  const Tag = level === 2 ? 'h2' : 'h3';
  return (
    <Tag className="section-title">
      <span className="section-en">{en}</span>
      <span className="section-ja">{ja}</span>
    </Tag>
  );
}
