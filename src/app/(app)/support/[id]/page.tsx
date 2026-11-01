'use client';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/client/api';
import { useAction } from '@/lib/client/hooks';
import { useRealtimeTable } from '@/lib/client/realtime';
import { Chat, type ChatMessage } from '@/components/layout/Chat';
import { ErrorState, Skeleton } from '@/components/ui/ui';
import { IconBack } from '@/components/brand/Icons';

export default function ThreadPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['thread', id], queryFn: () => api<{ thread: { subject: string; status: string }; messages: ChatMessage[] }>(`/api/support/threads/${id}/messages`), refetchInterval: 6000 });
  useRealtimeTable('support_messages', () => qc.invalidateQueries({ queryKey: ['thread', id] }), { filter: `thread_id=eq.${id}`, privateToken: true });
  const send = useAction((body: string) => api(`/api/support/threads/${id}/messages`, { body: { body } }), { onSuccess: () => qc.invalidateQueries({ queryKey: ['thread', id] }) });

  if (q.isError) return <ErrorState message="Обращение не найдено" />;
  return (
    <>
      <Link href="/support" className="mb-3 inline-flex items-center gap-1 text-sm text-white/50 hover:text-white"><IconBack size={18} />Все обращения</Link>
      {!q.data ? <Skeleton className="h-72" /> : (
        <>
          <h1 className="h-display mb-1 text-3xl text-white">{q.data.thread.subject}</h1>
          <p className="mb-4 text-xs text-white/40">{q.data.thread.status === 'open' ? 'Обращение открыто' : 'Обращение закрыто'}</p>
          <Chat messages={q.data.messages} mine="user" onSend={(t) => send.mutate(t)} sending={send.isPending} disabled={q.data.thread.status === 'closed'} />
        </>
      )}
    </>
  );
}
