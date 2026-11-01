'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/client/api';
import { ErrorState, Money, PageTitle, Pagination, Skeleton } from '@/components/ui/ui';
import { displayName, fmtDate } from '@/lib/format';

export default function AdminUsers() {
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const size = 20;
  const res = useQuery({ queryKey: ['admin-users', q, page], queryFn: () => api<{ rows: any[]; total: number }>(`/api/admin/users?q=${encodeURIComponent(q)}&page=${page}&size=${size}`), placeholderData: (p) => p });
  return (
    <>
      <PageTitle eyebrow="Управление" title="Пользователи" />
      <input className="input mb-4" placeholder="Поиск: Telegram ID или username" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
      {res.isError ? <ErrorState onRetry={() => res.refetch()} /> : res.isLoading ? <Skeleton className="h-64" /> : (
        <ul className="panel divide-y divide-white/5 overflow-hidden">
          {res.data?.rows.map((u) => (
            <li key={u.id}>
              <Link href={`/admin/users/${u.id}`} className="flex items-center gap-3 px-4 py-3.5 hover:bg-white/5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white">{displayName(u)} {u.is_banned && <span className="ml-1 rounded border border-rarity-mythic/50 px-1 text-[9px] uppercase text-rarity-mythic">бан</span>}</p>
                  <p className="text-xs text-white/40">ID {u.telegram_id}{u.username ? ` · @${u.username}` : ''} · {fmtDate(u.last_seen_at)}</p>
                </div>
                <Money value={Number(u.balance)} size={12} className="text-sm text-lime-200" />
              </Link>
            </li>
          ))}
          {!res.data?.rows.length && <li className="px-4 py-8 text-center text-sm text-white/40">Никого не найдено</li>}
        </ul>
      )}
      <Pagination page={page} total={res.data?.total ?? 0} size={size} onChange={setPage} />
    </>
  );
}
