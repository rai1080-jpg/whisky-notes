import { useMemo, useSyncExternalStore } from 'react';

/** GitHub Pages 等の静的配信でもリロードで壊れないよう、ハッシュルーティングにしている */
export type Route =
  | { name: 'list' }
  | { name: 'new' }
  | { name: 'recommend' }
  | { name: 'detail'; id: string }
  | { name: 'edit'; id: string }
  | { name: 'notfound' };

function parse(hash: string): Route {
  const parts = hash.replace(/^#/, '').split('/').filter(Boolean);
  if (parts.length === 0) return { name: 'list' };
  if (parts[0] === 'new' && parts.length === 1) return { name: 'new' };
  if (parts[0] === 'recommend' && parts.length === 1) return { name: 'recommend' };
  if (parts[0] === 'whisky' && parts[1]) {
    const id = decodeURIComponent(parts[1]);
    if (parts.length === 2) return { name: 'detail', id };
    if (parts.length === 3 && parts[2] === 'edit') return { name: 'edit', id };
  }
  return { name: 'notfound' };
}

const subscribe = (cb: () => void) => {
  window.addEventListener('hashchange', cb);
  return () => window.removeEventListener('hashchange', cb);
};

export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, () => window.location.hash);
  return useMemo(() => parse(hash), [hash]);
}

/** replace: true なら履歴を積まずに置き換える(保存後にフォームへ戻れないようにする) */
export function navigate(path: string, replace = false): void {
  if (replace) window.location.replace(`#${path}`);
  else window.location.hash = path;
}

export const paths = {
  list: '/',
  new: '/new',
  recommend: '/recommend',
  detail: (id: string) => `/whisky/${encodeURIComponent(id)}`,
  edit: (id: string) => `/whisky/${encodeURIComponent(id)}/edit`,
};
