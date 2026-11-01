'use client';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/client/api';
import { PageTitle, Skeleton, Money } from '@/components/ui/ui';
import { SettingsEditor } from '@/components/layout/SettingsEditor';
import { fmtDate, fmtPct } from '@/lib/format';

const nm = (u: any) => (u ? (u.username ? '@' + u.username : u.telegram_id) : '—');

export default function AdminGames() {
  const q = useQuery({ queryKey: ['admin-games'], queryFn: () => api<any>('/api/admin/games'), refetchInterval: 20_000 });
  const d = q.data;
  return (
    <>
      <PageTitle eyebrow="Демо-режимы" title="Игры" />
      <SettingsEditor title="Параметры" fields={[
        { key: 'cases_enabled', label: 'Кейсы включены', type: 'bool' },
        { key: 'upgrade_enabled', label: 'Upgrade включён', type: 'bool' },
        { key: 'upgrade_edge_bp', label: 'Upgrade: комиссия (б.п.)', type: 'int', hint: '500 = 5%. Шанс = цена_входа / цена_цели × (1 − комиссия)' },
        { key: 'upgrade_max_chance_bp', label: 'Upgrade: максимальный шанс (б.п.)', type: 'int', hint: '9500 = 95%' },
        { key: 'roulette_enabled', label: 'Рулетка включена', type: 'bool' },
        { key: 'roulette_round_seconds', label: 'Рулетка: длительность приёма ставок (сек)', type: 'int' },
        { key: 'roulette_min_bet', label: 'Рулетка: минимальная ставка', type: 'int' },
        { key: 'roulette_max_bet', label: 'Рулетка: максимальная ставка', type: 'int' },
        { key: 'blackjack_enabled', label: 'Blackjack включён', type: 'bool' },
        { key: 'blackjack_min_bet', label: 'Blackjack: минимальная ставка', type: 'int' },
        { key: 'blackjack_max_bet', label: 'Blackjack: максимальная ставка', type: 'int' },
      ]} />

      <h2 className="h-display mb-3 mt-8 text-[20px] text-white">Игровые операции</h2>
      {!d ? <Skeleton className="h-60" /> : (
        <div className="space-y-5">
          <Block title="Открытия кейсов" rows={d.openings.map((o: any) => [`${nm(o.user)} · ${o.case?.name}`, `${o.item?.name}`, <Money key="m" value={Number(o.price_paid)} size={11} />, fmtDate(o.created_at)])} />
          <Block title="Улучшения" rows={d.upgrades.map((o: any) => [nm(o.user), `${o.input?.name} → ${o.target?.name}`, o.success ? 'успех' : 'потеря', `${fmtPct(o.chance_bp / 10000)} · ${fmtDate(o.created_at)}`])} />
          <Block title="Ставки рулетки" rows={d.bets.map((o: any) => [nm(o.user), `${o.bet_type}${o.bet_value != null ? ' ' + o.bet_value : ''}`, <Money key="m" value={Number(o.amount)} size={11} />, o.payout == null ? 'ждём' : `выплата ${o.payout}`])} />
          <Block title="Blackjack" rows={d.blackjack.map((o: any) => [nm(o.user), o.outcome ?? o.status, <Money key="m" value={Number(o.bet)} size={11} />, fmtDate(o.created_at)])} />
          <Block title="Раунды рулетки" rows={d.rounds.map((o: any) => [`№${o.round_no}`, o.status, o.result ?? '—', o.result_color ?? ''])} />
        </div>
      )}
    </>
  );
}

function Block({ title, rows }: { title: string; rows: React.ReactNode[][] }) {
  return (
    <div>
      <p className="mb-2 text-xs uppercase tracking-[0.2em] text-white/40">{title}</p>
      <div className="panel divide-y divide-white/5 overflow-hidden">
        {!rows.length ? <p className="px-4 py-4 text-sm text-white/35">Нет данных</p> : rows.map((r, i) => (
          <div key={i} className="grid grid-cols-[1.2fr_1.2fr_.6fr_1fr] items-center gap-2 px-4 py-2.5 text-[12px] text-white/70">{r.map((c, j) => <span key={j} className="truncate">{c}</span>)}</div>
        ))}
      </div>
    </div>
  );
}
