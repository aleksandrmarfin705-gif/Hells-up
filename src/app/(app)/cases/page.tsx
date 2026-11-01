'use client';
import { Suspense, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/client/api';
import { CaseCard } from '@/components/game/Cards';
import { ErrorState, PageTitle, Segmented, Skeleton } from '@/components/ui/ui';
import type { CaseSummary } from '@/lib/types';

type Sort = 'all' | 'hits' | 'cheap' | 'rich';

function CasesInner() {
  const cat = useSearchParams().get('cat');
  const [sort, setSort] = useState<Sort>(cat === 'hits' || cat === 'cheap' || cat === 'rich' ? cat : 'all');
  const q = useQuery({ queryKey: ['cases'], queryFn: () => api<{ cases: CaseSummary[] }>('/api/cases') });
  const list = useMemo(() => {
    let l = [...(q.data?.cases ?? [])];
    if (sort === 'hits') l = l.filter((c) => c.is_featured);
    if (sort === 'cheap') l.sort((a, b) => a.price - b.price);
    if (sort === 'rich') l.sort((a, b) => (b.top_item?.virtual_price ?? 0) - (a.top_item?.virtual_price ?? 0));
    return l;
  }, [q.data, sort]);

  return (
    <>
      <PageTitle title="Кейсы" />
      <Segmented<Sort> value={sort} onChange={setSort} className="mb-5" options={[{ value: 'all', label: 'Все' }, { value: 'hits', label: 'Хиты' }, { value: 'cheap', label: 'Недорогие' }, { value: 'rich', label: 'Крупные' }]} />
      {q.isError ? <ErrorState onRetry={() => q.refetch()} /> : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {q.isLoading ? Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-60" />) : list.map((c, i) => <CaseCard key={c.id} c={c} index={i} />)}
        </div>
      )}
      {q.data && !list.length && <p className="panel mt-4 px-5 py-10 text-center text-sm text-white/50">Кейсов пока нет.</p>}
    </>
  );
}

export default function CasesPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96" />}>
      <CasesInner />
    </Suspense>
  );
}
