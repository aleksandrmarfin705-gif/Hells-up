'use client';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/client/api';
import { useAction } from '@/lib/client/hooks';
import { useRealtimeTable } from '@/lib/client/realtime';
import { toast } from '@/lib/client/store';
import { Chat, type ChatMessage } from '@/components/layout/Chat';
import { Button, ErrorState, Skeleton } from '@/components/ui/ui';
import { IconBack } from '@/components/brand/Icons';

export default function AdminThread() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['admin-thread', id], queryFn: () => api<{ thread: any; messages: ChatMessage[] }>(`/api/admin/support/${id}`), refetchInterval: 5000 });
  const reload = () => { qc.invalidateQueries({ queryKey: ['admin-thread', id] }); qc.invalidateQueries({ queryKey: ['admin-threads'] }); };
  useRealtimeTable('support_messages', reload, { filter: `thread_id=eq.${id}`, privateToken: true });
  const send = useAction((body: string) => api(`/api/admin/support/${id}`, { body: { body } }), { onSuccess: reload });
  const setStatus = useAction((status: 'open' | 'closed') => api(`/api/admin/support/${id}`, { method: 'PATCH', body: { status } }), { onSuccess: () => { toast.success('Статус обновлён'); reload(); } });
  if (q.isError) return <ErrorState message="Обращение не найдено" />;
  const t = q.data?.thread;
  return (
    <>
      <Link href="/admin/support" className="mb-3 inline-flex items-center gap-1 text-sm text-white/50 hover:text-white"><IconBack size={18} />Обращения</Link>
      {!q.data ? <Skeleton className="h-72" /> : (
        <>
          <div className="mb-4 flex items-start justify-between gap-3">
            <div><h1 className="h-display text-3xl text-white">{t.subject}</h1><p className="text-xs text-white/40">{t.user?.username ? '@' + t.user.username : t.user?.first_name} · ID {t.user?.telegram_id}</p></div>
            <Button size="sm" variant="dark" loading={setStatus.isPending} onClick={() => setStatus.mutate(t.status === 'open' ? 'closed' : 'open')}>{t.status === 'open' ? 'Закрыть' : 'Открыть'}</Button>
          </div>
          <Chat messages={q.data.messages} mine="admin" onSend={(b) => send.mutate(b)} sending={send.isPending} placeholder="Ответ пользователю…" />
        </>
      )}
    </>
  );
}
