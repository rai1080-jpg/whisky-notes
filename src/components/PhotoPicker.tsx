import { useRef, useState } from 'react';
import { fileToCompressedDataUrl } from '../image';
import { MAX_PHOTOS } from '../model';

interface Props {
  photos: string[];
  onChange: (photos: string[]) => void;
}

export function PhotoPicker({ photos, onChange }: Props) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const full = photos.length >= MAX_PHOTOS;

  async function handleFiles(input: HTMLInputElement) {
    const files = Array.from(input.files ?? []).slice(0, MAX_PHOTOS - photos.length);
    input.value = ''; // 同じ写真をもう一度選べるようにする
    if (files.length === 0) return;

    setBusy(true);
    setError('');
    const added: string[] = [];
    let failed = 0;
    for (const file of files) {
      try {
        added.push(await fileToCompressedDataUrl(file));
      } catch {
        failed++;
      }
    }
    if (added.length > 0) onChange([...photos, ...added]);
    if (failed > 0) setError(`${failed}枚の画像を読み込めませんでした(対応していない形式の可能性があります)`);
    setBusy(false);
  }

  return (
    <div>
      {photos.length > 0 && (
        <ul className="photo-grid">
          {photos.map((src, i) => (
            <li key={i} className="photo-item">
              <img src={src} alt={`ボトル写真 ${i + 1}`} />
              <button
                type="button"
                className="photo-remove"
                aria-label={`写真 ${i + 1} を削除`}
                disabled={busy}
                onClick={() => onChange(photos.filter((_, j) => j !== i))}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="photo-actions">
        <button
          type="button"
          className="btn"
          disabled={busy || full}
          onClick={() => cameraRef.current?.click()}
        >
          <svg className="btn-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 8.5h3.2l1.8-2.5h6l1.8 2.5H20V19H4z" />
            <circle cx="12" cy="13" r="3.4" />
          </svg>
          撮影する
        </button>
        <button
          type="button"
          className="btn"
          disabled={busy || full}
          onClick={() => libraryRef.current?.click()}
        >
          <svg className="btn-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 5h16v14H4z" />
            <path d="m4 16 5-5 4 4 2.5-2.5L20 17" />
            <circle cx="15.5" cy="9" r="1.4" />
          </svg>
          写真を選ぶ
        </button>
      </div>

      {/* capture でスマホのカメラを直接起動する。PC など非対応環境では通常のファイル選択になる */}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => void handleFiles(e.currentTarget)}
      />
      <input
        ref={libraryRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => void handleFiles(e.currentTarget)}
      />

      <p className="hint" role="status">
        {busy
          ? '写真を縮小しています…'
          : full
            ? `写真は最大${MAX_PHOTOS}枚までです`
            : `最大${MAX_PHOTOS}枚まで。保存時に自動で縮小されます`}
      </p>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
