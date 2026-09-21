// PWA アイコン(PNG)を生成する。外部依存なし: `npm run icons`
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons');
mkdirSync(outDir, { recursive: true });

// ---- PNG エンコーダ ----
const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
};
const encodePng = (size, rgb) => {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // RGB
  const stride = size * 3;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    rgb.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
};

// ---- 図柄(0..1 の正規化座標) ----
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const over = (base, top, alpha) => mix(base, top, alpha);
const clamp01 = (v) => Math.min(1, Math.max(0, v));

// ロックグラス: 上が広く下が狭い台形。maskable の安全領域(中心の半径40%)に収める
const G = { top: 0.29, bottom: 0.71, wTop: 0.46, wBottom: 0.35, rim: 0.016, base: 0.045 };
const halfWidth = (y) => (G.wTop + (G.wBottom - G.wTop) * ((y - G.top) / (G.bottom - G.top))) / 2;
const inGlass = (x, y, inset) =>
  y >= G.top + inset * 0 && y <= G.bottom - inset * 1.8 && Math.abs(x - 0.5) <= halfWidth(y) - inset;

const sample = (x, y) => {
  // 背景: 樽の中を思わせる深い茶色の放射グラデーション
  const d = Math.hypot(x - 0.5, y - 0.45);
  let c = mix([0x5a, 0x36, 0x1b], [0x1b, 0x11, 0x0a], clamp01(d / 0.75));

  if (inGlass(x, y, 0)) {
    c = over(c, [0xf4, 0xe3, 0xc4], 0.1); // ガラス本体
    const surface = G.top + 0.11;
    if (y >= surface && inGlass(x, y, G.rim)) {
      const t = clamp01((y - surface) / (G.bottom - surface));
      c = mix([0xf0, 0xb2, 0x4a], [0xa8, 0x5c, 0x17], t); // 琥珀色の液面 → 底
    }
    if (y > G.bottom - G.base * 2.4) c = over(c, [0xff, 0xf1, 0xd6], 0.22); // 厚い底
    if (!inGlass(x, y, G.rim)) c = mix(c, [0xf4, 0xe3, 0xc4], 0.85); // 縁
    // ハイライト
    const hx = 0.5 - halfWidth(y) + 0.045;
    if (Math.abs(x - hx) < 0.011 && y > G.top + 0.05 && y < G.bottom - 0.09) {
      c = over(c, [0xff, 0xff, 0xff], 0.32);
    }
  }
  return c;
};

const render = (size) => {
  const ss = 3;
  const px = Buffer.alloc(size * size * 3);
  for (let py = 0; py < size; py++) {
    for (let pxl = 0; pxl < size; pxl++) {
      const acc = [0, 0, 0];
      for (let sy = 0; sy < ss; sy++) {
        for (let sx = 0; sx < ss; sx++) {
          const c = sample((pxl + (sx + 0.5) / ss) / size, (py + (sy + 0.5) / ss) / size);
          acc[0] += c[0];
          acc[1] += c[1];
          acc[2] += c[2];
        }
      }
      const o = (py * size + pxl) * 3;
      px[o] = Math.round(acc[0] / (ss * ss));
      px[o + 1] = Math.round(acc[1] / (ss * ss));
      px[o + 2] = Math.round(acc[2] / (ss * ss));
    }
  }
  return encodePng(size, px);
};

for (const [name, size] of [
  ['icon-192.png', 192],
  ['icon-512.png', 512],
  ['icon-maskable-512.png', 512],
  ['apple-touch-icon.png', 180],
]) {
  writeFileSync(join(outDir, name), render(size));
  console.log('wrote', name);
}
