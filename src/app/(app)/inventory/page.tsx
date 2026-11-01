'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, newKey } from '@/lib/client/api';
import { useAction, useSetBalance } from '@/lib/client/hooks';
import { toast } from '@/lib/client/store';
import { haptic } from '@/lib/client/telegram';
import { ItemCard } from '@/components/game/Cards';
import { Reveal } from '@/components/game/Reveal';
import { Modal } from '@/components/ui/Modal';
import { Button, ConfirmDialog, EmptyState, ErrorState, Money, PageTitle, Skeleton } from '@/components/ui/ui';
import { IconInventory } from '@/components/brand/Icons';
import { fmtDate } from '@/lib/format';
import { RARITY, RARITY_ORDER, rarityOf } from '@/lib/rarity';
import { cn } from '@/lib/cn';
import type { InventoryItem, Rarity } from '@/lib/types';

type Sort = 'new' | 'price_desc' | 'price_asc' | 'rarity';
const SORTS: { value: Sort; label: string }[] = [
  { value: 'new', label: 'Новые' }, { value: 'price_desc', label: 'Дороже' }, { value: 'price_asc', label: 'Дешевле' }, { value: 'rarity', label: 'Редкость' },
];

export default function InventoryPage() {
  const qc = useQueryClient();
  const setBalance = useSetBalance();
  const q = useQuery({ queryKey: ['inventory'], queryFn: () => api<{ items: InventoryItem[] }>('/api/inventory') });
  const [sort, setSort] = useState<Sort>('new');
  const [rarity, setRarity] = useState<Rarity | 'all'>('all');
  const [search, setSearch] = useState('');
  const [sel, setSel] = useState<InventoryItem | null>(null);
  const [confirm, setConfirm] = useState(false);

  const items = useMemo(() => {
    let l = [...(q.data?.items ?? [])];
    if (rarity !== 'all') l = l.filter((i) => i.item.rarity === rarity);
    if (search.trim()) l = l.filter((i) => i.item.name.toLowerCase().includes(search.trim().toLowerCase()));
    const price = (i: InventoryItem) => Number(i.item.virtual_price);
    if (sort === 'price_desc') l.sort((a, b) => price(b) - price(a));
    if (sort === 'price_asc') l.sort((a, b) => price(a) - price(b));
    if (sort === 'rarity') l.sort((a, b) => rarityOf(b.item.rarity).rank - rarityOf(a.item.rarity).rank || price(b) - price(a));
    return l;
  }, [q.data, sort, rarity, search]);

  const total = (q.data?.items ?? []).reduce((s, i) => s + Number(i.item.virtual_price), 0);

  const sell = useAction((id: string) => api<{ balance: number; price: number }>('/api/inventory/sell', { body: { userItemId: id, key: newKey() } }), {
    onSuccess: (r) => {
      setBalance(r.balance); haptic.notify('success'); toast.success('Предмет продан', `+${r.price} демо-монет`);
      setConfirm(false); setSel(null); qc.invalidateQueries({ queryKey: ['inventory'] });
    },
  });

  return (
    <>
      <PageTitle title="Мои предметы" right={q.data && <div className="text-right"><p className="text-[11px] uppercase tracking-widest text-white/40">{q.data.items.length} шт.</p><Money value={total} className="text-lime-200" size={15} /></div>} />

      <input className="input mb-3" placeholder="Поиск по названию" value={search} onChange={(e) => setSearch(e.target.value)} />
      <div className="scroll-x mb-2">
        {(['all', ...RARITY_ORDER] as const).map((r) => (
          <button key={r} onClick={() => { haptic.select(); setRarity(r); }}
            className={cn('rounded-full border px-3.5 py-1.5 text-xs font-medium transition', rarity === r ? 'border-lime-400 bg-lime-400/15 text-lime-100' : 'border-white/10 text-white/50')}>
            {r === 'all' ? 'Все' : RARITY[r].label}
          </button>
        ))}
      </div>
      <div className="scroll-x mb-4">
        {SORTS.map((s) => (
          <button key={s.value} onClick={() => { haptic.select(); setSort(s.value); }}
            className={cn('rounded-full px-3.5 py-1.5 text-xs transition', sort === s.value ? 'bg-white/10 text-white' : 'text-white/40')}>{s.label}</button>
        ))}
      </div>

      {q.isError ? <ErrorState onRetry={() => q.refetch()} /> : q.isLoading ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-40" />)}</div>
      ) : !q.data?.items.length ? (
        <EmptyState icon={<IconInventory size={44} />} title="Здесь пока пусто" text="Откройте первый кейс — предметы появятся здесь." action={<Link href="/cases"><Button>К кейсам</Button></Link>} />
      ) : !items.length ? (
        <p className="panel px-5 py-10 text-center text-sm text-white/45">Ничего не найдено по фильтрам.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {items.map((i) => <ItemCard key={i.id} item={i.item} onClick={() => setSel(i)} />)}
        </div>
      )}

      <Modal open={!!sel} onOpenChange={(v) => !v && setSel(null)}>
        {sel && (
          <>
            <Reveal item={sel.item} />
            <p className="mt-3 text-center text-xs text-white/35">Получен {fmtDate(sel.acquired_at)} · {sel.source === 'case' ? 'из кейса' : sel.source === 'upgrade' ? 'улучшение' : 'выдан'}</p>
            <div className="mt-5 grid grid-cols-2 gap-2.5">
              <Link href={`/upgrade?item=${sel.id}`}><Button variant="dark" full>Улучшить</Button></Link>
              <Button onClick={() => setConfirm(true)}>Продать</Button>
            </div>
          </>
        )}
      </Modal>
      <ConfirmDialog open={confirm} onOpenChange={setConfirm} loading={sell.isPending} title="Продать предмет?"
        text={sel && <>«{sel.item.name}» будет продан за <Money value={Number(sel.item.virtual_price)} className="text-lime-200" /> виртуальных монет. Это действие нельзя отменить.</>}
        confirmLabel="Продать" onConfirm={() => sel && sell.mutate(sel.id)} />
    </>
  );
}
