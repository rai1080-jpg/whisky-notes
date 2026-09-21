import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin, type ResolvedConfig } from 'vite';

/**
 * ビルド成果物を走査して sw.template.js から dist/sw.js を生成する。
 * 全ファイルをプリキャッシュするので、初回アクセス後はオフラインでも起動できる。
 */
function pwaServiceWorker(): Plugin {
  let config: ResolvedConfig;

  const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap((name) => {
      const full = join(dir, name);
      return statSync(full).isDirectory() ? walk(full) : [full];
    });

  return {
    name: 'pwa-service-worker',
    apply: 'build',
    configResolved(c) {
      config = c;
    },
    closeBundle() {
      const outDir = resolve(config.root, config.build.outDir);
      const files = walk(outDir)
        .map((f) => relative(outDir, f).replace(/\\/g, '/'))
        .filter((f) => f !== 'sw.js');

      const hash = createHash('sha256');
      for (const f of files) hash.update(f).update(readFileSync(join(outDir, f)));

      const urls = ['./', ...files.map((f) => `./${f}`)];
      const template = readFileSync(resolve(config.root, 'sw.template.js'), 'utf8');
      const sw = template
        .replace("'__VERSION__'", () => JSON.stringify(hash.digest('hex').slice(0, 12)))
        .replace('__PRECACHE__;', () => `${JSON.stringify(urls, null, 2)};`);
      // 置換漏れのまま出力すると SW の評価が失敗して PWA が無効になるので、ビルドを失敗させる
      if (/__VERSION__|__PRECACHE__/.test(sw)) {
        throw new Error('sw.template.js のプレースホルダを置換できませんでした');
      }
      writeFileSync(join(outDir, 'sw.js'), sw);
    },
  };
}

export default defineConfig({
  // 相対パスにしておくと、サブディレクトリ配信(GitHub Pages 等)でもそのまま動く
  base: './',
  plugins: [react(), pwaServiceWorker()],
});
