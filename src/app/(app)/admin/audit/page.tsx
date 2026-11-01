'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/client/api';
import { ErrorState, PageTitle, Pagination, Skeleton } from '@/components/ui/ui';
import { fmtDate } from '@/lib/format';

export default function AdminAudit() {
  const [page, setPage] = useState(1);
  const q = useQuery({ queryKey: ['admin-audit', page], queryFn: () => api<{ rows: any[]; total: number }>(`/api/admin/audit?page=${page}&size=30`), placeholderData: (p) => p });
  return (
    <>
      <PageTitle eyebrow="Безопасность" title="Журнал действий" />
      {q.isError ? <ErrorState onRetry={() => q.refetch()} /> : q.isLoading ? <Skeleton className="h-72" /> : (
        <ul className="panel divide-y divide-white/5 overflow-hidden">
          {q.data?.rows.map((r) => (
            <li key={r.id} className="px-4 py-3">
              <div className="flex items-center justify-between gap-3"><span className="font-mono text-[13px] text-lime-200">{r.action}</span><span className="text-xs text-white/35">{fmtDate(r.created_at)}</span></div>
              <p className="mt-0.5 text-xs text-white/45">админ {r.actor_telegram_id} · {r.target_type ?? ''} {r.target_id ? String(r.target_id).slice(0, 8) : ''}</p>
              {r.diff && Object.keys(r.diff).length > 0 && <p className="mt-1 break-all font-mono text-[11px] text-white/30">{JSON.stringify(r.diff).slice(0, 220)}</p>}
            </li>
          ))}
          {!q.data?.rows.length && <li className="px-4 py-8 text-center text-sm text-white/40">Записей нет</li>}
        </ul>
      )}
      <Pagination page={page} total={q.data?.total ?? 0} size={30} onChange={setPage} />
    </>
  );
}
