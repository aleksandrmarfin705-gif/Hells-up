'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/client/api';
import { useRealtimeTable } from '@/lib/client/realtime';
import { ErrorState, PageTitle, Segmented, Skeleton } from '@/components/ui/ui';
import { IconChevron } from '@/components/brand/Icons';
import { timeAgo } from '@/lib/format';

export default function AdminSupport() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<'open' | 'closed' | 'all'>('open');
  const q = useQuery({ queryKey: ['admin-threads', status], queryFn: () => api<{ threads: any[] }>(`/api/admin/support${status === 'all' ? '' : `?status=${status}`}`), refetchInterval: 10_000 });
  useRealtimeTable('support_messages', () => qc.invalidateQueries({ queryKey: ['admin-threads'] }), { privateToken: true });
  return (
    <>
      <PageTitle eyebrow="Обращения" title="Поддержка" />
      <Segmented value={status} onChange={setStatus} className="mb-4" options={[{ value: 'open', label: 'Открытые' }, { value: 'closed', label: 'Закрытые' }, { value: 'all', label: 'Все' }]} />
      {q.isError ? <ErrorState onRetry={() => q.refetch()} /> : q.isLoading ? <Skeleton className="h-52" /> : (
        <ul className="panel divide-y divide-white/5 overflow-hidden">
          {q.data?.threads.map((t) => (
            <li key={t.id}>
              <Link href={`/admin/support/${t.id}`} className="flex items-center gap-3 px-4 py-4 hover:bg-white/5">
                <span className={`h-2.5 w-2.5 flex-none rounded-full ${t.status === 'open' ? 'bg-emerald-400' : 'bg-white/20'}`} />
                <div className="min-w-0 flex-1"><p className="truncate text-[15px] text-white">{t.subject}</p><p className="text-xs text-white/40">{t.user?.username ? '@' + t.user.username : t.user?.first_name} · ID {t.user?.telegram_id} · {timeAgo(t.last_message_at)}</p></div>
                <IconChevron size={18} className="text-white/30" />
              </Link>
            </li>
          ))}
          {!q.data?.threads.length && <li className="px-4 py-8 text-center text-sm text-white/40">Обращений нет</li>}
        </ul>
      )}
    </>
  );
}
