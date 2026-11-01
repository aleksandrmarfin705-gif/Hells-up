'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/client/api';
import { ItemArt } from '@/components/game/ItemArt';
import { EmptyState, ErrorState, Money, PageTitle, Pagination, Skeleton } from '@/components/ui/ui';
import { IconHistory } from '@/components/brand/Icons';
import { fmtDate, fmtPct } from '@/lib/format';
import { BET_LABELS, type BetType } from '@/lib/game/roulette';
import { cn } from '@/lib/cn';

const TABS = [
  { value: 'cases', label: 'Кейсы' }, { value: 'items', label: 'Предметы' }, { value: 'sales', label: 'Продажи' },
  { value: 'upgrades', label: 'Улучшения' }, { value: 'roulette', label: 'Рулетка' }, { value: 'blackjack', label: 'Blackjack' }, { value: 'balance', label: 'Баланс' },
] as const;
type Tab = (typeof TABS)[number]['value'];

const TX: Record<string, string> = {
  welcome: 'Стартовый баланс', topup: 'Демо-пополнение', case_open: 'Открытие кейса', item_sell: 'Продажа предмета', roulette_bet: 'Ставка в рулетке',
  roulette_win: 'Выплата рулетки', blackjack_bet: 'Ставка Blackjack', blackjack_win: 'Выплата Blackjack', admin_adjust: 'Корректировка администратором',
};
const OUT: Record<string, string> = { win: 'Победа', blackjack: 'Blackjack', push: 'Ничья', lose: 'Поражение' };

export default function HistoryPage() {
  const [tab, setTab] = useState<Tab>('cases');
  const [page, setPage] = useState(1);
  const size = 15;
  const q = useQuery({ queryKey: ['history', tab, page], queryFn: () => api<{ rows: any[]; total: number }>(`/api/history?type=${tab}&page=${page}&size=${size}`), placeholderData: (p) => p });

  return (
    <>
      <PageTitle title="История" />
      <div className="scroll-x mb-4">
        {TABS.map((t) => (
          <button key={t.value} onClick={() => { setTab(t.value); setPage(1); }}
            className={cn('rounded-full border px-4 py-2 text-[13px] font-medium transition', tab === t.value ? 'border-lime-400 bg-lime-400/15 text-lime-100' : 'border-white/10 text-white/50')}>{t.label}</button>
        ))}
      </div>
      {q.isError ? <ErrorState onRetry={() => q.refetch()} /> : q.isLoading ? <Skeleton className="h-72" /> : !q.data?.rows.length ? (
        <EmptyState icon={<IconHistory size={44} />} title="Записей пока нет" text="Здесь появятся ваши действия в этом разделе." />
      ) : (
        <ul className="panel divide-y divide-white/5 overflow-hidden">
          {q.data.rows.map((r) => <Row key={r.id} tab={tab} r={r} />)}
        </ul>
      )}
      <Pagination page={page} total={q.data?.total ?? 0} size={size} onChange={setPage} />
    </>
  );
}

function ItemLine({ item, sub, right }: { item: any; sub: string; right?: React.ReactNode }) {
  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <ItemArt art={item.art} rarity={item.rarity} imageUrl={item.image_url} size={44} glow={false} />
      <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-white">{item.name}</p><p className="truncate text-xs text-white/40">{sub}</p></div>
      {right}
    </li>
  );
}

function Row({ tab, r }: { tab: Tab; r: any }) {
  switch (tab) {
    case 'cases': return <ItemLine item={r.item} sub={`${r.case?.name ?? 'Кейс'} · ${fmtDate(r.created_at)}`} right={<div className="text-right"><Money value={Number(r.item.virtual_price)} size={12} className="text-sm text-lime-200" /><p className="text-[11px] text-white/35">−{Number(r.price_paid)}</p></div>} />;
    case 'items': return <ItemLine item={r.item} sub={`${r.source === 'case' ? 'Из кейса' : r.source === 'upgrade' ? 'Улучшение' : 'Выдан'} · ${fmtDate(r.acquired_at)}`} right={<span className="text-xs text-white/40">{r.status === 'owned' ? 'в инвентаре' : r.status === 'sold' ? 'продан' : 'потрачен'}</span>} />;
    case 'sales': return <ItemLine item={r.item} sub={fmtDate(r.closed_at)} right={<Money value={Number(r.sold_price)} signed className="text-sm text-emerald-400" size={12} />} />;
    case 'upgrades': return (
      <li className="flex items-center gap-3 px-4 py-3">
        <ItemArt art={r.input.art} rarity={r.input.rarity} size={36} glow={false} /><span className="text-white/30">→</span><ItemArt art={r.target.art} rarity={r.target.rarity} size={36} glow={false} />
        <div className="min-w-0 flex-1"><p className="truncate text-sm text-white">{r.input.name} → {r.target.name}</p><p className="text-xs text-white/40">{fmtDate(r.created_at)} · шанс {fmtPct(r.chance_bp / 10000)}</p></div>
        <span className={cn('text-xs font-semibold', r.success ? 'text-emerald-400' : 'text-rarity-mythic')}>{r.success ? 'Успех' : 'Потеря'}</span>
      </li>);
    case 'roulette': {
      const net = r.payout == null ? null : Number(r.payout) - Number(r.amount);
      return (
        <li className="flex items-center gap-3 px-4 py-3">
          <div className="min-w-0 flex-1"><p className="truncate text-sm text-white">{r.bet_type === 'number' ? `Число ${r.bet_value}` : BET_LABELS[r.bet_type as BetType]} · <Money value={Number(r.amount)} size={12} /></p><p className="text-xs text-white/40">Раунд №{r.round?.round_no} · выпало {r.round?.result ?? '…'} · {fmtDate(r.created_at)}</p></div>
          <span className={cn('text-sm font-semibold tabular-nums', net == null ? 'text-white/40' : net > 0 ? 'text-emerald-400' : 'text-white/40')}>{net == null ? 'ждём' : net > 0 ? `+${net}` : `−${r.amount}`}</span>
        </li>);
    }
    case 'blackjack': return (
      <li className="flex items-center gap-3 px-4 py-3">
        <div className="min-w-0 flex-1"><p className="text-sm text-white">Ставка <Money value={Number(r.bet)} size={12} /></p><p className="text-xs text-white/40">{fmtDate(r.created_at)}</p></div>
        <span className={cn('text-sm font-semibold', r.outcome === 'lose' ? 'text-rarity-mythic' : r.outcome === 'push' ? 'text-white/60' : 'text-emerald-400')}>{OUT[r.outcome] ?? '—'}</span>
      </li>);
    default: return (
      <li className="flex items-center gap-3 px-4 py-3">
        <div className="min-w-0 flex-1"><p className="truncate text-sm text-white">{TX[r.type] ?? r.type}</p><p className="text-xs text-white/40">{fmtDate(r.created_at)} · баланс {Number(r.balance_after).toLocaleString('ru-RU')}</p></div>
        <Money value={Number(r.amount)} signed size={12} className={cn('text-sm', Number(r.amount) > 0 ? 'text-emerald-400' : 'text-white/60')} />
      </li>);
  }
}
