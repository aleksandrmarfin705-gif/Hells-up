'use client';
import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/client/api';
import { useAction } from '@/lib/client/hooks';
import { toast } from '@/lib/client/store';
import { ItemCard } from '@/components/game/Cards';
import { Button, ConfirmDialog, ErrorState, Money, Skeleton, Stat } from '@/components/ui/ui';
import { IconBack } from '@/components/brand/Icons';
import { displayName, fmt, fmtDate } from '@/lib/format';

export default function AdminUser() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['admin-user', id], queryFn: () => api<any>(`/api/admin/users/${id}`) });
  const [delta, setDelta] = useState('');
  const [reason, setReason] = useState('');
  const [banConfirm, setBanConfirm] = useState(false);
  const [banReason, setBanReason] = useState('');
  const refresh = () => qc.invalidateQueries({ queryKey: ['admin-user', id] });

  const adjust = useAction(() => api(`/api/admin/users/${id}/balance`, { body: { delta: Number(delta), reason } }), {
    onSuccess: () => { toast.success('Баланс изменён', 'Запись добавлена в аудит'); setDelta(''); setReason(''); refresh(); },
  });
  const ban = useAction((is_banned: boolean) => api(`/api/admin/users/${id}`, { method: 'PATCH', body: { is_banned, ban_reason: banReason || undefined } }), {
    onSuccess: () => { setBanConfirm(false); setBanReason(''); toast.success('Статус обновлён'); refresh(); },
  });

  if (q.isError) return <ErrorState message="Пользователь не найден" />;
  const u = q.data?.user; const st = q.data?.stats;
  return (
    <>
      <Link href="/admin/users" className="mb-3 inline-flex items-center gap-1 text-sm text-white/50 hover:text-white"><IconBack size={18} />Пользователи</Link>
      {!u ? <Skeleton className="h-60" /> : (
        <>
          <section className="panel p-5">
            <p className="h-display text-3xl text-white">{displayName(u)}</p>
            <p className="text-sm text-white/45">ID {u.telegram_id}{u.username ? ` · @${u.username}` : ''} · с {fmtDate(u.created_at)}</p>
            <Money value={Number(u.balance)} size={22} className="gold-text mt-3 text-3xl" />
            {u.is_banned && <p className="mt-3 rounded-xl border border-rarity-mythic/40 bg-rarity-mythic/10 px-3 py-2 text-sm text-rarity-mythic">Заблокирован{u.ban_reason ? `: ${u.ban_reason}` : ''}</p>}
            <div className="mt-4"><Button variant={u.is_banned ? 'dark' : 'danger'} onClick={() => (u.is_banned ? ban.mutate(false) : setBanConfirm(true))} loading={ban.isPending && u.is_banned}>{u.is_banned ? 'Разблокировать' : 'Заблокировать'}</Button></div>
          </section>

          <section className="panel mt-4 space-y-3 p-5">
            <h2 className="h-display text-2xl text-white">Изменить демо-баланс</h2>
            <input className="input" inputMode="numeric" placeholder="Сумма (например 500 или -200)" value={delta} onChange={(e) => setDelta(e.target.value.replace(/[^\d-]/g, ''))} />
            <input className="input" placeholder="Причина (попадёт в аудит)" value={reason} maxLength={200} onChange={(e) => setReason(e.target.value)} />
            <Button full loading={adjust.isPending} disabled={!Number(delta) || reason.trim().length < 3} onClick={() => adjust.mutate(undefined)}>Применить</Button>
          </section>

          {st && (
            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
              <Stat label="Кейсов" value={fmt(st.cases_opened)} /><Stat label="Предметов" value={fmt(st.items_owned)} hint={`${fmt(st.inventory_value)} монет`} />
              <Stat label="Улучшения" value={`${st.upgrades_won}/${st.upgrades_total}`} /><Stat label="Blackjack" value={`${st.blackjack_wins}/${st.blackjack_games}`} />
            </div>
          )}

          <h2 className="h-display mb-3 mt-8 text-[26px] text-white">Инвентарь</h2>
          {!q.data.inventory.length ? <p className="panel px-5 py-6 text-center text-sm text-white/40">Пусто</p> : (
            <div className="grid grid-cols-3 gap-2.5 md:grid-cols-6">{q.data.inventory.map((i: any) => <ItemCard key={i.id} item={i.item} size={56} />)}</div>
          )}

          <h2 className="h-display mb-3 mt-8 text-[26px] text-white">Последние операции</h2>
          <ul className="panel divide-y divide-white/5 overflow-hidden">
            {q.data.transactions.map((t: any) => (
              <li key={t.id} className="flex items-center justify-between px-4 py-2.5 text-sm"><span className="text-white/70">{t.type}</span><span className="text-xs text-white/35">{fmtDate(t.created_at)}</span><Money value={Number(t.amount)} signed size={12} className={Number(t.amount) > 0 ? 'text-emerald-400' : 'text-white/60'} /></li>
            ))}
          </ul>
        </>
      )}
      <ConfirmDialog open={banConfirm} onOpenChange={setBanConfirm} title="Заблокировать пользователя?" danger confirmLabel="Заблокировать" loading={ban.isPending} onConfirm={() => ban.mutate(true)}
        text={<><p className="mb-3">Пользователь потеряет доступ ко всем разделам.</p><input className="input" placeholder="Причина (необязательно)" value={banReason} maxLength={200} onChange={(e) => setBanReason(e.target.value)} /></>} />
    </>
  );
}
