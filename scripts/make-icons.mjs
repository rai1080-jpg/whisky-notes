/*
 * PWA アイコン(PNG)を生成する。外部依存なし: `npm run icons`
 *
 * 元画像 assets/icon-source.png を読み込み、各サイズへ縮小して書き出す。
 * ライブラリを足さずに済ませるため、PNG の読み書きはこのファイル内で行っている
 * (対応するのは 8bit・非インターレースの RGB / RGBA のみ)。
 */
import { deflateSync, inflateSync } from 'node:zlib';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const srcPath = join(root, 'assets', 'icon-source.png');
const outDir = join(root, 'public', 'icons');
mkdirSync(outDir, { recursive: true });

// ---------- PNG ----------
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

function encodePng(size, rgb) {
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
}

/** PNG を読み、{ width, height, rgb } を返す */
function decodePng(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('PNG ではありません');
  let pos = 8;
  let width = 0;
  let height = 0;
  let channels = 0;
  const idat = [];

  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      const depth = data[8];
      const colorType = data[9];
      const interlace = data[12];
      if (depth !== 8 || interlace !== 0 || (colorType !== 2 && colorType !== 6)) {
        throw new Error(`未対応の PNG です(depth=${depth} color=${colorType} interlace=${interlace})`);
      }
      channels = colorType === 2 ? 3 : 4;
    } else if (type === 'IDAT') {
      idat.push(data);
    } else if (type === 'IEND') {
      break;
    }
    pos += 12 + len;
  }

  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const out = Buffer.alloc(width * height * 3);
  const line = Buffer.alloc(stride);
  const prev = Buffer.alloc(stride);

  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    raw.copy(line, 0, y * (stride + 1) + 1, (y + 1) * (stride + 1));
    // フィルタの復元(PNG 仕様の 5 種類)
    for (let i = 0; i < stride; i++) {
      const a = i >= channels ? line[i - channels] : 0;
      const b = prev[i];
      const c = i >= channels ? prev[i - channels] : 0;
      let v = line[i];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      line[i] = v & 0xff;
    }
    for (let x = 0; x < width; x++) {
      const o = (y * width + x) * 3;
      out[o] = line[x * channels];
      out[o + 1] = line[x * channels + 1];
      out[o + 2] = line[x * channels + 2];
    }
    line.copy(prev);
  }
  return { width, height, rgb: out };
}

// ---------- 縮小・配置 ----------
/** 面積平均による縮小。srcRect の範囲を dstSize 四方へ収める */
function resample(src, srcW, dstSize, rect) {
  const dst = Buffer.alloc(dstSize * dstSize * 3);
  const scale = rect.size / dstSize;
  for (let y = 0; y < dstSize; y++) {
    const y0 = Math.floor(rect.y + y * scale);
    const y1 = Math.max(y0 + 1, Math.floor(rect.y + (y + 1) * scale));
    for (let x = 0; x < dstSize; x++) {
      const x0 = Math.floor(rect.x + x * scale);
      const x1 = Math.max(x0 + 1, Math.floor(rect.x + (x + 1) * scale));
      let r = 0;
      let g = 0;
      let b = 0;
      let n = 0;
      for (let sy = y0; sy < y1; sy++) {
        for (let sx = x0; sx < x1; sx++) {
          const o = (sy * srcW + sx) * 3;
          r += src[o];
          g += src[o + 1];
          b += src[o + 2];
          n++;
        }
      }
      const o = (y * dstSize + x) * 3;
      dst[o] = Math.round(r / n);
      dst[o + 1] = Math.round(g / n);
      dst[o + 2] = Math.round(b / n);
    }
  }
  return dst;
}

/** 縮小した絵を、背景色で塗った正方形の中央に置く(maskable 用の余白づくり) */
function padded(src, srcW, size, inner, bg) {
  const canvas = Buffer.alloc(size * size * 3);
  for (let i = 0; i < size * size; i++) {
    canvas[i * 3] = bg[0];
    canvas[i * 3 + 1] = bg[1];
    canvas[i * 3 + 2] = bg[2];
  }
  const img = resample(src, srcW, inner, { x: 0, y: 0, size: srcW });
  const off = Math.round((size - inner) / 2);
  for (let y = 0; y < inner; y++) {
    img.copy(canvas, ((y + off) * size + off) * 3, y * inner * 3, (y + 1) * inner * 3);
  }
  return canvas;
}

const source = decodePng(readFileSync(srcPath));
if (source.width !== source.height) {
  throw new Error('元画像は正方形にしてください');
}
console.log(`source: ${source.width} x ${source.height}`);

const full = { x: 0, y: 0, size: source.width };
for (const [name, size] of [
  ['icon-512.png', 512],
  ['icon-192.png', 192],
  ['apple-touch-icon.png', 180],
]) {
  writeFileSync(join(outDir, name), encodePng(size, resample(source.rgb, source.width, size, full)));
  console.log('wrote', name);
}

/*
 * maskable は端末側で角を丸く切り取られる。中央の 80% に収まるよう縮小し、
 * 周囲は元画像の四隅の色(暗い背景)で埋める。
 */
const corner = (x, y) => {
  const o = (y * source.width + x) * 3;
  return [source.rgb[o], source.rgb[o + 1], source.rgb[o + 2]];
};
const corners = [corner(2, 2), corner(source.width - 3, 2), corner(2, 40), corner(source.width - 3, 40)];
const bg = [0, 1, 2].map((i) => Math.round(corners.reduce((a, c) => a + c[i], 0) / corners.length));
writeFileSync(
  join(outDir, 'icon-maskable-512.png'),
  encodePng(512, padded(source.rgb, source.width, 512, 384, bg)),
);
console.log('wrote icon-maskable-512.png (背景色 rgb(' + bg.join(',') + '))');
