'use client';
import { useCallback, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, newKey } from '@/lib/client/api';
import { useAction, useMe, useSetBalance } from '@/lib/client/hooks';
import { haptic } from '@/lib/client/telegram';
import { toast } from '@/lib/client/store';
import { CaseArt } from '@/components/game/CaseArt';
import { ItemArt } from '@/components/game/ItemArt';
import { RarityBadge } from '@/components/game/RarityBadge';
import { Reel } from '@/components/game/Reel';
import { Reveal } from '@/components/game/Reveal';
import { Modal } from '@/components/ui/Modal';
import { Button, ErrorState, Money, Skeleton } from '@/components/ui/ui';
import { IconBack } from '@/components/brand/Icons';
import { fmt, fmtPct } from '@/lib/format';
import { rarityOf } from '@/lib/rarity';
import type { CaseDetail, Item } from '@/lib/types';

type OpenResult = {
  opening_id: string; user_item_id: string; item: Item; balance: number; price_paid: number; roll: number;
  fair: { server_seed_hash: string; client_seed: string; nonce: number };
};

export default function CasePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const { data: me } = useMe();
  const setBalance = useSetBalance();
  const q = useQuery({ queryKey: ['case', id], queryFn: () => api<{ case: CaseDetail }>(`/api/cases/${id}`) });

  const [result, setResult] = useState<OpenResult | null>(null);
  const [phase, setPhase] = useState<'idle' | 'spin' | 'reveal'>('idle');
  const c = q.data?.case;

  const open = useAction(() => api<OpenResult>(`/api/cases/${id}/open`, { body: { key: newKey() } }), {
    onSuccess: (r) => { setResult(r); setPhase('spin'); },
  });
  const sell = useAction((userItemId: string) => api<{ balance: number; price: number }>('/api/inventory/sell', { body: { userItemId, key: newKey() } }), {
    onSuccess: (r) => { setBalance(r.balance); toast.success(`Продано за ${r.price} монет`); qc.invalidateQueries({ queryKey: ['inventory'] }); close(false); },
  });

  const finishSpin = useCallback(() => {
    setPhase('reveal');
    if (result) {
      setBalance(result.balance);
      qc.invalidateQueries({ queryKey: ['inventory'] });
      qc.invalidateQueries({ queryKey: ['home'] });
      if (rarityOf(result.item.rarity).rank >= 2) haptic.notify('success');
    }
  }, [result, setBalance, qc]);

  function close(again: boolean) {
    if (phase === 'spin' && result) setBalance(result.balance);
    setPhase('idle');
    setResult(null);
    if (again) setTimeout(() => open.mutate(undefined), 150);
  }

  const pool = useMemo(() => (c?.items ?? []).map((i) => ({ id: i.id, name: i.name, rarity: i.rarity, art: i.art, image_url: i.image_url, weight: i.weight })), [c]);
  const balance = me?.user.balance ?? 0;
  const enough = c ? balance >= c.price : false;

  if (q.isError) return <ErrorState message="Кейс не найден или отключён" onRetry={() => router.push('/cases')} />;

  return (
    <>
      <Link href="/cases" className="mb-3 inline-flex items-center gap-1 text-sm text-white/50 hover:text-white"><IconBack size={18} />Все кейсы</Link>
      {!c ? <Skeleton className="h-80 w-full" /> : (
        <>
          <section className="relative overflow-hidden rounded-3xl border border-white/10 p-6 text-center" style={{ background: 'radial-gradient(70% 70% at 50% 25%, rgba(198,244,50,.12), transparent 70%), linear-gradient(180deg,#16181c,#0e0f12)' }}>
            <div className="animate-floaty"><CaseArt art={c.art} imageUrl={c.image_url} size={180} className="mx-auto" /></div>
            <h1 className="h-display mt-2 text-[42px] leading-none text-white">{c.name}</h1>
            <p className="mx-auto mt-2 max-w-sm text-sm text-white/55">{c.description}</p>
            <Button size="lg" full className="mx-auto mt-6 max-w-sm" loading={open.isPending} disabled={!enough || !me?.settings.cases_enabled} onClick={() => open.mutate(undefined)}>
              {!me?.settings.cases_enabled ? 'Кейсы отключены' : enough ? <>Открыть за <Money value={c.price} size={17} className="text-[#0d1403]" /></> : 'Недостаточно монет'}
            </Button>
            {!enough && <p className="mt-3 text-xs text-white/40">Пополните демо-баланс кнопкой «+» вверху.</p>}
          </section>

          <h2 className="h-display mb-3 mt-8 text-[20px] text-white">Содержимое кейса</h2>
          <ul className="panel divide-y divide-white/5 overflow-hidden">
            {c.items.map((it) => {
              const r = rarityOf(it.rarity);
              return (
                <li key={it.id} className="flex items-center gap-3 px-4 py-3" style={{ boxShadow: `inset 3px 0 0 ${r.color}` }}>
                  <ItemArt art={it.art} rarity={it.rarity} imageUrl={it.image_url} size={44} glow={false} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white">{it.name}</p>
                    <RarityBadge rarity={it.rarity} className="mt-1" />
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold tabular-nums text-white">{fmtPct(it.chance)}</p>
                    <Money value={it.virtual_price} size={12} className="text-xs text-lime-200/80" />
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 px-1 text-xs leading-relaxed text-white/35">
            Результат определяется на сервере по схеме provably fair. Шансы — доля веса предмета от суммы весов кейса. Все предметы и монеты виртуальные.
          </p>
        </>
      )}

      <Modal open={phase !== 'idle'} onOpenChange={(v) => !v && phase === 'reveal' && close(false)} dismissible={phase === 'reveal'} className="md:max-w-xl">
        {result && phase === 'spin' && (
          <div className="py-6">
            <p className="eyebrow mb-4 text-center">Открываем кейс…</p>
            <Reel pool={pool} winner={result.item} onDone={finishSpin} />
          </div>
        )}
        {result && phase === 'reveal' && (
          <div>
            <Reveal item={result.item} caption="Вам выпало" />
            <div className="mt-6 grid gap-2.5">
              <Button size="lg" onClick={() => close(true)} disabled={balance < (c?.price ?? 0)}>Открыть ещё</Button>
              <div className="grid grid-cols-2 gap-2.5">
                <Button variant="dark" className="whitespace-nowrap px-3 text-[14px]" loading={sell.isPending} onClick={() => sell.mutate(result.user_item_id)}>Продать · {fmt(result.item.virtual_price)}</Button>
                <Button variant="dark" onClick={() => router.push('/inventory')}>К предметам</Button>
              </div>
            </div>
            <p className="mt-4 break-all text-center text-[10px] leading-relaxed text-white/30">
              fair · hash {result.fair.server_seed_hash.slice(0, 16)}… · client {result.fair.client_seed} · nonce {result.fair.nonce}
            </p>
          </div>
        )}
      </Modal>
    </>
  );
}
