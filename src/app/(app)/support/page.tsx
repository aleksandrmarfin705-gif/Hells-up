'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/client/api';
import { useAction } from '@/lib/client/hooks';
import { useRealtimeTable } from '@/lib/client/realtime';
import { toast } from '@/lib/client/store';
import { Modal } from '@/components/ui/Modal';
import { Button, EmptyState, ErrorState, PageTitle, Skeleton } from '@/components/ui/ui';
import { IconChevron, IconSupport } from '@/components/brand/Icons';
import { timeAgo } from '@/lib/format';

type Thread = { id: string; subject: string; status: 'open' | 'closed'; last_message_at: string };

export default function SupportPage() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['threads'], queryFn: () => api<{ threads: Thread[] }>('/api/support/threads'), refetchInterval: 15_000 });
  useRealtimeTable('support_messages', () => qc.invalidateQueries({ queryKey: ['threads'] }), { privateToken: true });
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const create = useAction(() => api<{ thread: Thread }>('/api/support/threads', { body: { subject, body } }), {
    onSuccess: () => { setOpen(false); setSubject(''); setBody(''); toast.success('Обращение создано', 'Мы ответим в этом чате'); qc.invalidateQueries({ queryKey: ['threads'] }); },
  });

  return (
    <>
      <PageTitle title="Поддержка" right={<Button size="sm" onClick={() => setOpen(true)}>Новое</Button>} />
      {q.isError ? <ErrorState onRetry={() => q.refetch()} /> : q.isLoading ? <Skeleton className="h-40" /> : !q.data?.threads.length ? (
        <EmptyState icon={<IconSupport size={44} />} title="Обращений нет" text="Есть вопрос или нашли ошибку? Напишите — мы ответим прямо здесь." action={<Button onClick={() => setOpen(true)}>Написать</Button>} />
      ) : (
        <ul className="panel divide-y divide-white/5 overflow-hidden">
          {q.data.threads.map((t) => (
            <li key={t.id}>
              <Link href={`/support/${t.id}`} className="flex items-center gap-3 px-4 py-4 hover:bg-white/5">
                <span className={`h-2.5 w-2.5 flex-none rounded-full ${t.status === 'open' ? 'bg-emerald-400' : 'bg-white/20'}`} />
                <div className="min-w-0 flex-1"><p className="truncate text-[15px] font-medium text-white">{t.subject}</p><p className="text-xs text-white/40">{t.status === 'open' ? 'Открыто' : 'Закрыто'} · {timeAgo(t.last_message_at)}</p></div>
                <IconChevron size={18} className="text-white/30" />
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Modal open={open} onOpenChange={setOpen} title="Новое обращение">
        <div className="space-y-3">
          <input className="input" placeholder="Тема" maxLength={120} value={subject} onChange={(e) => setSubject(e.target.value)} />
          <textarea className="input min-h-[120px] resize-none" placeholder="Опишите вопрос" maxLength={2000} value={body} onChange={(e) => setBody(e.target.value)} />
          <Button full size="lg" loading={create.isPending} disabled={!subject.trim() || !body.trim()} onClick={() => create.mutate(undefined)}>Отправить</Button>
        </div>
      </Modal>
    </>
  );
}
