import type { BottleShape } from '../bottles';

/**
 * 写真が無い銘柄に出す、線画のボトル。
 * ラベルの再現はせず、ボトルの形の違いだけを描き分ける。
 */
const SHAPES: Record<BottleShape, { body: string; cap: string; liquid: string; label: [number, number, number, number] }> = {
  // なで肩の標準的な形
  classic: {
    body: 'M26 18V34C26 40 14 42 14 50V108Q14 112 18 112H42Q46 112 46 108V50C46 42 34 40 34 34V18Z',
    cap: 'M24.5 6h11v12h-11Z',
    liquid: 'M15 58H45V108Q45 111 42 111H18Q15 111 15 108Z',
    label: [18, 66, 24, 26],
  },
  // 首の長い細身の形
  tall: {
    body: 'M27 12V40C27 46 17 48 17 56V108Q17 112 21 112H39Q43 112 43 108V56C43 48 33 46 33 40V12Z',
    cap: 'M25.5 2h9v10h-9Z',
    liquid: 'M18 62H42V108Q42 111 39 111H21Q18 111 18 108Z',
    label: [20, 70, 20, 24],
  },
  // 肩の張った角型
  square: {
    body: 'M26 18V30L14 40V110Q14 112 16 112H44Q46 112 46 110V40L34 30V18Z',
    cap: 'M24.5 7h11v11h-11Z',
    liquid: 'M15 54H45V110Q45 111 44 111H16Q15 111 15 110Z',
    label: [17, 62, 26, 30],
  },
  // 背が低く幅の広い形
  squat: {
    body: 'M26 34V48C26 52 10 54 10 62V108Q10 112 14 112H46Q50 112 50 108V62C50 54 34 52 34 48V34Z',
    cap: 'M24 24h12v10h-12Z',
    liquid: 'M11 70H49V108Q49 111 46 111H14Q11 111 11 108Z',
    label: [16, 76, 28, 22],
  },
};

/** 樽香が強いほど濃い琥珀色にする */
const LIQUID_COLORS = ['#d3a660', '#b8874e', '#97683a'] as const;

interface Props {
  shape: BottleShape;
  /** 樽香の強さ(1〜3) */
  oak: 1 | 2 | 3;
}

export function BottleArt({ shape, oak }: Props) {
  const s = SHAPES[shape];
  const [lx, ly, lw, lh] = s.label;
  return (
    <svg className="bottle-art" viewBox="0 0 60 120" aria-hidden="true">
      <path className="bottle-liquid" d={s.liquid} fill={LIQUID_COLORS[oak - 1]} />
      <rect className="bottle-label" x={lx} y={ly} width={lw} height={lh} />
      <path className="bottle-line" d={s.body} />
      <path className="bottle-line" d={s.cap} />
    </svg>
  );
}
