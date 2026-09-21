# ウイスキーノート

ウイスキーのテイスティングノートを記録する PWA。React + TypeScript + Vite。
データはブラウザの localStorage にのみ保存されます(バックエンドなし)。

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
| `src/model.ts` | データモデル、評価軸の定義、localStorage 読込時の検証 |
| `src/store.ts` | localStorage の読み書き(容量超過を検知して結果を返す) |
| `src/image.ts` | 写真の縮小(長辺800px)・JPEG 圧縮 |
| `src/router.ts` | ハッシュルーティング(`#/`, `#/new`, `#/whisky/:id`, `#/whisky/:id/edit`) |
| `src/pages/` | 一覧・登録/編集・詳細 |
| `sw.template.js` | Service Worker の雛形。ビルド時に全ファイルのプリキャッシュ一覧を埋めて `dist/sw.js` を生成 |
| `public/manifest.json` | Web App Manifest |

## 保存容量について

localStorage は約 5MB が上限です。写真は 1 枚あたり約 80KB 前後に圧縮しますが、
写真を多く登録すると上限に達します。一覧画面の下部に使用量の目安を表示し、
上限に達して保存できない場合はフォームにエラーを表示します。
