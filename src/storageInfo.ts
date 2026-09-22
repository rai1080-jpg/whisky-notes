/** 一覧画面の下部に出す、保存容量の目安表示に使う */
export interface StorageInfo {
  supported: boolean;
  usageBytes: number | null;
  quotaBytes: number | null;
}

/**
 * navigator.storage.estimate() は IndexedDB を含むこのオリジンの使用量/上限をバイト単位で返す。
 * 上限は端末の空き容量に応じて動的に決まる(数百MB〜数GB)ため、localStorage の
 * 固定5MBと違って決め打ちできない。取得できない場合は表示自体を省く。
 */
export async function getStorageInfo(): Promise<StorageInfo> {
  try {
    if (!navigator.storage?.estimate) return { supported: false, usageBytes: null, quotaBytes: null };
    const { usage, quota } = await navigator.storage.estimate();
    return {
      supported: true,
      usageBytes: typeof usage === 'number' ? usage : null,
      quotaBytes: typeof quota === 'number' ? quota : null,
    };
  } catch {
    return { supported: false, usageBytes: null, quotaBytes: null };
  }
}

/** ブラウザに、可能なら保存領域を消えにくくするよう頼む(ベストエフォート) */
export function requestPersistentStorage(): void {
  navigator.storage?.persist?.().catch(() => {
    /* 拒否されても致命的ではないため無視する */
  });
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = bytes / 1024;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }
  return `${value < 10 ? value.toFixed(1) : Math.round(value)}${units[i]}`;
}
