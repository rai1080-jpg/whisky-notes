import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { PageHeader } from './components/PageHeader';
import { paths, useRoute } from './router';
import { useWhiskies, useWhiskiesReady } from './store';
import { DetailPage } from './pages/DetailPage';
import { FormPage } from './pages/FormPage';
import { ListPage, type ListState } from './pages/ListPage';

function NotFound() {
  return (
    <>
      <PageHeader title="ウイスキーノート" backTo={paths.list} />
      <main className="page">
        <div className="empty">
          <p className="empty-title">ページが見つかりません</p>
          <p>記録が削除されたか、URLが正しくない可能性があります。</p>
          <a className="btn btn-primary" href={`#${paths.list}`}>
            一覧に戻る
          </a>
        </div>
      </main>
    </>
  );
}

export default function App() {
  const route = useRoute();
  const whiskies = useWhiskies();
  const ready = useWhiskiesReady();

  // 一覧の検索・並び替えは、詳細を見て戻っても保持する
  const [listState, setListState] = useState<ListState>({
    query: '',
    sortKey: 'date',
    sortDir: 'desc',
  });
  const listScroll = useRef(0);

  const routeKey = route.name === 'detail' || route.name === 'edit' ? `${route.name}:${route.id}` : route.name;
  useLayoutEffect(() => {
    window.scrollTo(0, route.name === 'list' ? listScroll.current : 0);
  }, [routeKey]); // 画面が切り替わったときだけ実行する

  const knownPlaces = useMemo(() => whiskies.map((w) => w.place), [whiskies]);

  switch (route.name) {
    case 'list':
      return (
        <ListPage
          whiskies={whiskies}
          ready={ready}
          state={listState}
          onStateChange={setListState}
          onLeave={() => {
            listScroll.current = window.scrollY;
          }}
        />
      );
    case 'new':
      return <FormPage key="new" knownPlaces={knownPlaces} />;
    case 'detail': {
      const w = whiskies.find((x) => x.id === route.id);
      return w ? <DetailPage key={w.id} whisky={w} /> : <NotFound />;
    }
    case 'edit': {
      const w = whiskies.find((x) => x.id === route.id);
      return w ? <FormPage key={w.id} whisky={w} knownPlaces={knownPlaces} /> : <NotFound />;
    }
    case 'notfound':
      return <NotFound />;
  }
}
