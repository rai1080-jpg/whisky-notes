/*
 * PWA アイコン(PNG)を生成する。外部依存なし: `npm run icons`
 *
 * 写実的な見た目にするため、平面的な図形を塗るのではなく、
 * 距離関数(SDF)によるレイマーチングでグラスを実際に描画している。
 * ガラスの屈折・全反射・液体の吸光(ランベルト・ベール則)・
 * 卓上の影と集光(コースティクス)を近似して、写真のような質感を狙う。
 */
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons');
mkdirSync(outDir, { recursive: true });

// ---------- PNG エンコーダ ----------
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

// ---------- ベクトル ----------
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const addv = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const mulv = (a, b) => [a[0] * b[0], a[1] * b[1], a[2] * b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm = (a) => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const reflect = (i, n) => sub(i, mul(n, 2 * dot(i, n)));
/** 屈折。全反射の場合は null */
const refract = (i, n, eta) => {
  const cosi = -dot(i, n);
  const k = 1 - eta * eta * (1 - cosi * cosi);
  if (k < 0) return null;
  return addv(mul(i, eta), mul(n, eta * cosi - Math.sqrt(k)));
};
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const mix = (a, b, t) => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];
const smoothstep = (e0, e1, x) => {
  const t = clamp01((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
};

// ---------- 形(回転体の断面を2Dの多角形で持つ) ----------
/** 2D 多角形の符号付き距離 */
function sdPoly(px, py, poly) {
  let d = (px - poly[0][0]) ** 2 + (py - poly[0][1]) ** 2;
  let s = 1;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i, i++) {
    const ex = poly[j][0] - poly[i][0];
    const ey = poly[j][1] - poly[i][1];
    const wx = px - poly[i][0];
    const wy = py - poly[i][1];
    const t = clamp01((wx * ex + wy * ey) / (ex * ex + ey * ey));
    const bx = wx - ex * t;
    const by = wy - ey * t;
    d = Math.min(d, bx * bx + by * by);
    const c1 = py >= poly[i][1];
    const c2 = py < poly[j][1];
    const c3 = ex * wy > ey * wx;
    if ((c1 && c2 && c3) || (!c1 && !c2 && !c3)) s = -s;
  }
  return s * Math.sqrt(d);
}

// ロックグラスの断面(右半分)。単位は概ね 1 = グラス直径
const BASE_TOP = 0.11; // 分厚い底の高さ
const TOP = 0.78; // 縁の高さ
const R_BOT = 0.40;
const R_TOP = 0.475;
const WALL = 0.052;
const rOuter = (y) => R_BOT + (R_TOP - R_BOT) * (y / TOP);
const rInner = (y) => rOuter(y) - WALL;

const GLASS_POLY = [
  [0, 0],
  [R_BOT, 0],
  [R_TOP, TOP],
  [R_TOP - WALL, TOP],
  [rInner(BASE_TOP), BASE_TOP],
  [0, BASE_TOP],
];

// 液面。壁際がわずかに立ち上がる(メニスカス)
const LIQ_TOP = 0.52;
// 内壁よりわずかに外側まで液体を広げ、ガラスと隙間なく繋げる。
// 隙間があると、光が液体を通らずにガラスを素通りしてしまう
const rLiq = rInner(LIQ_TOP) + 0.006;
const LIQUID_POLY = [
  [0, BASE_TOP - 0.006],
  [rInner(BASE_TOP) + 0.006, BASE_TOP - 0.006],
  [rLiq, LIQ_TOP],
  [rLiq - 0.02, LIQ_TOP + 0.012],
  [rLiq - 0.07, LIQ_TOP - 0.004],
  [0, LIQ_TOP - 0.004],
];

const sdGlass = (p) => sdPoly(Math.hypot(p[0], p[2]), p[1], GLASS_POLY);
const sdLiquid = (p) => sdPoly(Math.hypot(p[0], p[2]), p[1], LIQUID_POLY);
const sdSolid = (p) => Math.min(sdGlass(p), sdLiquid(p));

function normalAt(p) {
  const e = 0.0012;
  return norm([
    sdSolid([p[0] + e, p[1], p[2]]) - sdSolid([p[0] - e, p[1], p[2]]),
    sdSolid([p[0], p[1] + e, p[2]]) - sdSolid([p[0], p[1] - e, p[2]]),
    sdSolid([p[0], p[1], p[2] + e]) - sdSolid([p[0], p[1], p[2] - e]),
  ]);
}

// ---------- カメラ ----------
const TARGET = [0, 0.36, 0];
const EYE = [0.12, 0.66, 2.3];
const FORWARD = norm(sub(TARGET, EYE));
const RIGHT = norm(cross(FORWARD, [0, 1, 0]));
const UP = cross(RIGHT, FORWARD);

// ---------- 環境・光 ----------
/*
 * 光源はすべて画角の外に置く。画面に入ると、ガラス越しに白い塊として写り込んでしまう。
 * 液体は、天井方向の環境光と、グラス奥の卓上に置いた光だまりを透過して発色させる。
 */
const LIGHT = norm([-0.55, 0.9, -0.5]); // 主光源(左上奥)
const FILL = norm([-0.62, 0.7, 0.35]); // 補助光(左上手前)。前面に映り込みを作る
const AMBER = [0.96, 0.66, 0.26];
/** 液体の吸光係数。距離が長いほど濃い琥珀色になる */
const ABSORB = [0.4, 1.1, 3.0];

/** 指定方向を中心とした、縁のぼけた円形の面光源 */
function panel(rd, dir, radius, softness) {
  const ang = Math.acos(clamp01(dot(rd, dir)) * 0.999999);
  return 1 - smoothstep(radius, radius + softness, ang);
}

function env(rd) {
  const up = clamp01(rd[1] * 0.5 + 0.5);
  // 背景は暗いままにして、光源だけを面として置く(背景全体が光らないように)
  let c = mix([0.006, 0.006, 0.008], [0.03, 0.03, 0.036], up * up);
  // 天井方向のごく弱い環境光。ガラスの稜線と液体を持ち上げる
  c = addv(c, mul([0.55, 0.57, 0.62], Math.pow(clamp01(rd[1]), 1.5) * 0.38));
  c = addv(
    c,
    mul([1.0, 0.96, 0.88], panel(rd, LIGHT, 0.3, 0.28) * 7 + panel(rd, LIGHT, 0.015, 0.03) * 10),
  );
  c = addv(c, mul([0.86, 0.89, 1.0], panel(rd, FILL, 0.22, 0.3) * 0.9));
  return c;
}

/** 卓上(y=0 の面)の色。影と、液体を通った光が集まる明るい部分を近似する */
function tableColor(p) {
  const r = Math.hypot(p[0], p[2]);
  let c = [0.05, 0.049, 0.053];

  // 影: 光源と反対側(カメラ側)へ伸びる楕円
  const sx = (p[0] - LIGHT[0] * 0.5) / 0.78;
  const sz = (p[2] - LIGHT[2] * 0.5) / 0.62;
  const shadow = 1 - 0.88 * (1 - smoothstep(0.5, 1.4, Math.hypot(sx, sz)));
  c = mul(c, shadow);

  // 集光: 液体を透過した光が焦点を結ぶ、琥珀色の明るい部分
  const cx = (p[0] - LIGHT[0] * 0.38) / 0.3;
  const cz = (p[2] - LIGHT[2] * 0.38) / 0.24;
  const caustic = 1 - smoothstep(0.15, 1.2, Math.hypot(cx, cz));
  c = addv(c, mul(AMBER, caustic * caustic * 0.85));

  // グラスの奥に置いた光のこぼれ。液体を後ろから照らす役目も兼ねる
  const glow = 1 - smoothstep(0.1, 1.15, Math.hypot(p[0] / 0.7, (p[2] + 0.8) / 0.6));
  c = addv(c, mul([1.0, 0.92, 0.8], glow * glow * 0.34));

  // 接地部のごく狭い暗がり
  c = mul(c, 0.45 + 0.55 * smoothstep(R_BOT - 0.04, R_BOT + 0.12, r));
  // 遠景は背景へ溶かし、地平線が線として出ないようにする
  return mix(c, [0.012, 0.012, 0.014], smoothstep(1.1, 3.2, r));
}

const PLANE_EPS = 1e-4;
/** y=0 の面との交差 */
function hitPlane(ro, rd) {
  if (rd[1] >= -1e-6) return Infinity;
  const t = -ro[1] / rd[1];
  return t > PLANE_EPS ? t : Infinity;
}

const MAX_T = 12;
/** 外側からガラス/液体へのレイマーチ */
function marchOutside(ro, rd) {
  let t = 0.002;
  for (let i = 0; i < 140; i++) {
    const p = addv(ro, mul(rd, t));
    const d = sdSolid(p);
    if (d < 0.0006) return t;
    t += Math.max(d * 0.85, 0.0007);
    if (t > MAX_T) break;
  }
  return Infinity;
}

/** 内側から表面までのレイマーチ。同時に液体中の距離を積算する */
function marchInside(ro, rd) {
  let t = 0.002;
  let liquidDist = 0;
  for (let i = 0; i < 160; i++) {
    const p = addv(ro, mul(rd, t));
    const d = sdSolid(p);
    const step = Math.max(-d * 0.85, 0.0007);
    if (sdLiquid(p) < 0) liquidDist += step;
    if (d > -0.0006) return { t, liquidDist };
    t += step;
    if (t > MAX_T) break;
  }
  return { t, liquidDist };
}

const IOR = 1.47;
const schlick = (cos, f0) => f0 + (1 - f0) * Math.pow(1 - cos, 5);
const F0 = ((1 - IOR) / (1 + IOR)) ** 2;

/** 液体中を通った分だけ琥珀色に染める(吸光) */
const absorb = (c, dist) =>
  mulv(c, [
    Math.exp(-ABSORB[0] * dist),
    Math.exp(-ABSORB[1] * dist),
    Math.exp(-ABSORB[2] * dist),
  ]);

/** ガラスの外に出たレイの行き先 */
function background(ro, rd) {
  const t = hitPlane(ro, rd);
  return t < Infinity ? tableColor(addv(ro, mul(rd, t))) : env(rd);
}

/** ガラスに入ったあと、屈折を繰り返して外に出るまで追跡する */
function traceInterior(ro, rd, depth) {
  let color = [0, 0, 0];
  let throughput = [1, 1, 1];
  let p = ro;
  let dir = rd;

  for (let bounce = 0; bounce < depth; bounce++) {
    const { t, liquidDist } = marchInside(p, dir);
    if (!Number.isFinite(t)) break;
    const hit = addv(p, mul(dir, t));
    throughput = absorb(throughput, liquidDist);

    const n = mul(normalAt(hit), -1); // 内側から見た法線
    const cos = clamp01(-dot(dir, n));
    const f = schlick(cos, F0);
    const out = refract(dir, n, IOR);

    if (out) {
      // 外に出る分
      const exitPoint = addv(hit, mul(out, 0.004));
      color = addv(color, mulv(mul(throughput, 1 - f), background(exitPoint, out)));
      throughput = mul(throughput, f); // 残りは内部で反射して続行
      if (throughput[0] + throughput[1] + throughput[2] < 0.02) break;
    }
    // 全反射(または一部反射)して内部を進む
    dir = reflect(dir, n);
    p = addv(hit, mul(dir, 0.004));
  }
  return color;
}

/** カメラから飛ばす1本 */
function trace(ro, rd) {
  const tSolid = marchOutside(ro, rd);
  const tPlane = hitPlane(ro, rd);

  if (tSolid < tPlane) {
    const hit = addv(ro, mul(rd, tSolid));
    const n = normalAt(hit);
    const cos = clamp01(-dot(rd, n));
    const f = schlick(cos, F0);

    const rdir = reflect(rd, n);
    const reflected = background(addv(hit, mul(rdir, 0.004)), rdir);
    // 縁に乗るシャープな映り込み
    const spec = Math.pow(Math.max(0, dot(rdir, LIGHT)), 180) * 5;

    const tdir = refract(rd, n, 1 / IOR);
    const transmitted = tdir
      ? traceInterior(addv(hit, mul(tdir, 0.004)), tdir, 5)
      : [0, 0, 0];

    return addv(
      addv(mul(reflected, f), mul(transmitted, 1 - f)),
      mul([1, 0.97, 0.92], spec),
    );
  }
  if (tPlane < Infinity) return tableColor(addv(ro, mul(rd, tPlane)));
  return env(rd);
}

/** 明るさを整えて 0-255 に落とす(簡易トーンマッピング + ガンマ) */
function toByte(value) {
  const v = value * 1.35; // 露出
  const m = (v * (2.51 * v + 0.03)) / (v * (2.43 * v + 0.59) + 0.14); // ACES 近似
  return Math.round(255 * Math.pow(clamp01(m), 1 / 2.2));
}

/** 画角。小さいほど寄る */
function render(size, aa, zoom) {
  const px = Buffer.alloc(size * size * 3);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let acc = [0, 0, 0];
      for (let sy = 0; sy < aa; sy++) {
        for (let sx = 0; sx < aa; sx++) {
          const u = ((x + (sx + 0.5) / aa) / size) * 2 - 1;
          const v = 1 - ((y + (sy + 0.5) / aa) / size) * 2;
          const rd = norm(
            addv(addv(mul(RIGHT, u * zoom), mul(UP, v * zoom)), FORWARD),
          );
          acc = addv(acc, trace(EYE, rd));
        }
      }
      const n = aa * aa;
      const o = (y * size + x) * 3;
      px[o] = toByte(acc[0] / n);
      px[o + 1] = toByte(acc[1] / n);
      px[o + 2] = toByte(acc[2] / n);
    }
    if (y % 64 === 0) process.stdout.write('.');
  }
  return px;
}

/** 面積平均による縮小 */
function resize(src, srcSize, dstSize) {
  const dst = Buffer.alloc(dstSize * dstSize * 3);
  const scale = srcSize / dstSize;
  for (let y = 0; y < dstSize; y++) {
    const y0 = Math.floor(y * scale);
    const y1 = Math.min(srcSize, Math.ceil((y + 1) * scale));
    for (let x = 0; x < dstSize; x++) {
      const x0 = Math.floor(x * scale);
      const x1 = Math.min(srcSize, Math.ceil((x + 1) * scale));
      let r = 0;
      let g = 0;
      let b = 0;
      let count = 0;
      for (let sy = y0; sy < y1; sy++) {
        for (let sx = x0; sx < x1; sx++) {
          const o = (sy * srcSize + sx) * 3;
          r += src[o];
          g += src[o + 1];
          b += src[o + 2];
          count++;
        }
      }
      const o = (y * dstSize + x) * 3;
      dst[o] = Math.round(r / count);
      dst[o + 1] = Math.round(g / count);
      dst[o + 2] = Math.round(b / count);
    }
  }
  return dst;
}

const started = Date.now();
process.stdout.write('rendering');
// 通常アイコン用(寄り)
const main = render(512, 3, 0.34);
process.stdout.write('\nrendering maskable');
// maskable 用は、周囲を切り取られても欠けないよう引きで描く
const maskable = render(512, 2, 0.56);
process.stdout.write('\n');

for (const [name, size, src] of [
  ['icon-512.png', 512, main],
  ['icon-192.png', 192, main],
  ['apple-touch-icon.png', 180, main],
  ['icon-maskable-512.png', 512, maskable],
]) {
  const data = size === 512 ? src : resize(src, 512, size);
  writeFileSync(join(outDir, name), encodePng(size, data));
  console.log('wrote', name);
}
console.log(`done in ${((Date.now() - started) / 1000).toFixed(1)}s`);
