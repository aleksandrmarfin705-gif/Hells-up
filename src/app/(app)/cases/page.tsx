'use client';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/client/api';
import { CaseCard } from '@/components/game/Cards';
import { ErrorState, PageTitle, Segmented, Skeleton } from '@/components/ui/ui';
import type { CaseSummary } from '@/lib/types';

type Sort = 'pop' | 'cheap' | 'rich';

export default function CasesPage() {
  const [sort, setSort] = useState<Sort>('pop');
  const q = useQuery({ queryKey: ['cases'], queryFn: () => api<{ cases: CaseSummary[] }>('/api/cases') });
  const list = useMemo(() => {
    const l = [...(q.data?.cases ?? [])];
    if (sort === 'cheap') l.sort((a, b) => a.price - b.price);
    if (sort === 'rich') l.sort((a, b) => b.price - a.price);
    return l;
  }, [q.data, sort]);

  return (
    <>
      <PageTitle eyebrow="Каталог" title="Кейсы" />
      <Segmented<Sort> value={sort} onChange={setSort} className="mb-5" options={[{ value: 'pop', label: 'Все' }, { value: 'cheap', label: 'Дешевле' }, { value: 'rich', label: 'Дороже' }]} />
      {q.isError ? <ErrorState onRetry={() => q.refetch()} /> : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {q.isLoading ? Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-60" />) : list.map((c, i) => <CaseCard key={c.id} c={c} index={i} />)}
        </div>
      )}
      {q.data && !list.length && <p className="panel mt-4 px-5 py-10 text-center text-sm text-white/50">Кейсов пока нет.</p>}
    </>
  );
}
