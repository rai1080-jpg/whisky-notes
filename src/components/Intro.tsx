import { useEffect, useRef, useState } from 'react';

/*
 * 起動時のオープニング。グラスの線が描かれ、ウイスキーが注がれ、題字が浮かぶ。
 * 消えると同時に、トップの写真と言葉が順に現れる(html に付けるクラスで styles.css 側が動く)。
 *
 * ・アプリを開いたときに1回だけ流す(同じタブで再読み込みしても繰り返さない)
 * ・画面をタップすると飛ばせる
 * ・端末で「視差効果を減らす/アニメーションを減らす」設定のときは流さない
 */
const SEEN_KEY = 'whisky-notes:intro-seen';
/**
 * 最後の文字が出きってから、消え始めるまでの間。
 * 時間だけで区切ると、読み込みが遅い端末で文字が出きる前に消えてしまうため、
 * 最後の文字の動きが終わった時点から数える
 */
const AFTER_MS = 450;
/** 動きの終わりが検知できなかった場合でも、これ以上は引き留めない */
const MAX_HOLD_MS = 4000;
/** オープニングが消えていく時間(CSS の transition と合わせる) */
const FADE_MS = 700;
/** 消えたあと、トップの要素が現れ終わるまでの時間(CSS の animation と合わせる) */
const REVEAL_MS = 1400;

function shouldPlay(): boolean {
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return false;
  try {
    if (sessionStorage.getItem(SEEN_KEY)) return false;
    sessionStorage.setItem(SEEN_KEY, '1');
  } catch {
    /* 保存できない環境(プライベートモード等)でも、毎回流すだけで支障はない */
  }
  return true;
}

// 読み込み時に一度だけ判定する。コンポーネント内で判定すると、
// 開発時の StrictMode で二重に呼ばれ、2回目が「再生済み」と判定されてしまうため
const PLAY = shouldPlay();

type Phase = 'play' | 'leave' | 'done';

export function Intro() {
  const [phase, setPhase] = useState<Phase>(PLAY ? 'play' : 'done');
  const holdTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const leave = () => setPhase((p) => (p === 'play' ? 'leave' : p));

  useEffect(() => {
    if (!PLAY) return;
    document.documentElement.classList.add('is-opening');
    const t = setTimeout(leave, MAX_HOLD_MS);
    return () => {
      clearTimeout(t);
      clearTimeout(holdTimer.current);
    };
  }, []);

  useEffect(() => {
    if (phase !== 'leave') return;
    document.documentElement.classList.add('is-revealing');
    const t = setTimeout(() => setPhase('done'), FADE_MS);
    return () => clearTimeout(t);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'done' || !PLAY) return;
    // 現れる動きが終わってから目印を外す(以降、一覧に戻るたびに動き直さないように)
    const t = setTimeout(
      () => document.documentElement.classList.remove('is-opening', 'is-revealing'),
      REVEAL_MS,
    );
    return () => clearTimeout(t);
  }, [phase]);

  if (phase === 'done') return null;

  return (
    <div
      className={phase === 'leave' ? 'intro leave' : 'intro'}
      aria-hidden="true"
      onClick={leave}
    >
      <div className="intro-inner">
        <svg className="intro-glass" viewBox="0 0 24 24" fill="none">
          <path className="intro-liquid" d="M7.4 11.4h9.2l-1.5 7.9H8.9L7.4 11.4Z" />
          <path className="intro-outline" d="M6 4h12l-3 16H9L6 4Z" pathLength={1} />
        </svg>
        <p className="intro-title">Whisky Notes</p>
        <p
          className="intro-sub"
          onAnimationEnd={() => {
            clearTimeout(holdTimer.current);
            holdTimer.current = setTimeout(leave, AFTER_MS);
          }}
        >
          一杯の記憶を、残す。
        </p>
      </div>
    </div>
  );
}
