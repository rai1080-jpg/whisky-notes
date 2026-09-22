# ウイスキーノート

ウイスキーのテイスティングノートを記録する PWA。React + TypeScript + Vite。
データはブラウザの IndexedDB にのみ保存されます(バックエンドなし)。

## 使い方

```bash
npm install
npm run dev       # 開発サーバ(Service Worker は無効)
npm run build     # 型チェック + 本番ビルド(dist/ に sw.js も生成)
npm run preview   # ビルド結果の確認(PWA の動作確認はこちら)
npm run icons     # PWA アイコンの再生成(scripts/make-icons.mjs)
```

## スマホで試す / ホーム画面に追加する

Service Worker とホーム画面への追加(PWA のインストール)は **HTTPS(または localhost)でのみ** 動作します。
同じ Wi-Fi 上の `http://192.168.x.x:5173` で開いた場合、画面表示・入力・写真の選択/撮影は使えますが、
PWA としてはインストールできません(カメラ起動の `capture` は HTTP でも動く想定ですが、機種によって異なるため実機で確認してください)。

`dist/` を GitHub Pages / Netlify / Cloudflare Pages などの HTTPS ホスティングに置くのが手軽です
(相対パスでビルドしているのでサブディレクトリ配信でも動作します)。

## 構成

| パス | 内容 |
| --- | --- |
| `src/model.ts` | データモデル、評価軸・飲み方の定義、読込時の検証 |
| `src/db.ts` | IndexedDB の薄いラッパー |
| `src/store.ts` | 記録の読み書き。IndexedDB を優先し、使えない環境では localStorage にフォールバックする(容量超過を検知して結果を返す) |
| `src/storageInfo.ts` | `navigator.storage` を使った保存容量の見積もり表示、永続化リクエスト |
| `src/image.ts` | 写真の縮小(長辺1600px)・JPEG 圧縮 |
| `src/router.ts` | ハッシュルーティング(`#/`, `#/new`, `#/whisky/:id`, `#/whisky/:id/edit`) |
| `src/pages/` | 一覧・登録/編集・詳細 |
| `sw.template.js` | Service Worker の雛形。ビルド時に全ファイルのプリキャッシュ一覧を埋めて `dist/sw.js` を生成 |
| `public/manifest.json` | Web App Manifest |

## 飲み方別の記録

1銘柄につき、ストレート・ロック・ハイボール・水割り・お湯割り・トワイスアップ・その他から
試した飲み方を選び、**飲み方ごとに5段階評価とメモ**を残せます(銘柄全体の総合評価とは別)。
一覧画面では、記録のある飲み方で絞り込めます(例:ハイボールが美味しかった銘柄を探す)。

旧バージョンで保存した記録には飲み方の情報がないため、読み込み時に空として扱います。

## 保存容量について

記録は IndexedDB に保存しており、上限は端末の空き容量に応じて動的に決まります
(数百MB〜数GB程度になることが多いですが、ブラウザや端末により異なります)。
写真は 1 枚あたり長辺1600px・おおむね数百KBに圧縮し、1銘柄につき最大10枚まで登録できます。
一覧画面の下部に `navigator.storage.estimate()` による使用量の目安を表示し、
上限に達して保存できない場合はフォームにエラーを表示します。

IndexedDB が使えない環境(古いブラウザや一部のプライベートブラウジングモード)では、
自動的に localStorage(約5MB)にフォールバックします。旧バージョン(localStorage のみ)で
保存していたデータがあれば、初回起動時に自動で IndexedDB へ移行します。
