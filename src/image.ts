/** 長辺の上限(px)。ボトル写真は縦長が多いので、幅ではなく長辺で 800px に揃える */
const MAX_SIDE = 800;
/** data URL の目標文字数。localStorage(約5MB)を圧迫しないよう画質を下げて収める */
const TARGET_CHARS = 90_000;
const START_QUALITY = 0.75;
const MIN_QUALITY = 0.4;

interface Decoded {
  source: CanvasImageSource;
  width: number;
  height: number;
  release: () => void;
}

async function decode(file: File): Promise<Decoded> {
  // createImageBitmap は EXIF の向きを反映してくれる(スマホの縦撮り写真が横倒しにならない)
  if (typeof createImageBitmap === 'function') {
    try {
      const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
      return { source: bmp, width: bmp.width, height: bmp.height, release: () => bmp.close() };
    } catch {
      // フォールバックへ
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return {
      source: img,
      width: img.naturalWidth,
      height: img.naturalHeight,
      release: () => URL.revokeObjectURL(url),
    };
  } catch (e) {
    URL.revokeObjectURL(url);
    throw e;
  }
}

/** 画像ファイルを長辺 800px の JPEG に縮小・圧縮して data URL で返す */
export async function fileToCompressedDataUrl(file: File): Promise<string> {
  const img = await decode(file);
  try {
    if (!img.width || !img.height) throw new Error('empty image');
    const scale = Math.min(1, MAX_SIDE / Math.max(img.width, img.height));
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('canvas unavailable');
    // 透過 PNG が JPEG 化で黒くならないよう白で下塗りする
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img.source, 0, 0, w, h);

    let quality = START_QUALITY;
    let url = canvas.toDataURL('image/jpeg', quality);
    while (url.length > TARGET_CHARS && quality > MIN_QUALITY) {
      quality = Math.max(MIN_QUALITY, quality - 0.08);
      url = canvas.toDataURL('image/jpeg', quality);
    }
    return url;
  } finally {
    img.release();
  }
}
