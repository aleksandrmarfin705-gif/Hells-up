'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { api } from '@/lib/client/api';
import { useAction, useCountdown, useMe, useSetBalance } from '@/lib/client/hooks';
import { haptic } from '@/lib/client/telegram';
import { toast } from '@/lib/client/store';
import { Button, ErrorState, Money, PageTitle, Pagination, Skeleton } from '@/components/ui/ui';
import { Coin, IconBack, IconLock } from '@/components/brand/Icons';
import { fmt, fmtDate } from '@/lib/format';
import { cn } from '@/lib/cn';

const PRESETS = [100, 500, 1000, 5000, 10000, 50000];
const MIN = 10;
const MAX = 1_000_000;

const TX_LABEL: Record<string, string> = {
  welcome: 'Стартовый баланс', topup: 'Демо-монеты', case_open: 'Открытие кейса', item_sell: 'Продажа предмета', roulette_bet: 'Ставка в рулетке',
  roulette_win: 'Выплата рулетки', blackjack_bet: 'Ставка Blackjack', blackjack_win: 'Выплата Blackjack', admin_adjust: 'Корректировка администратором',
};

type Tx = { id: string; type: string; amount: number; balance_after: number; created_at: string };

const mmss = (ms: number) => {
  const s = Math.ceil(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}` : `${m}:${String(sec).padStart(2, '0')}`;
};

export default function TopupPage() {
  const { data: me, refetch: refetchMe } = useMe();
  const setBalance = useSetBalance();
  const [preset, setPreset] = useState<number | null>(1000);
  const [custom, setCustom] = useState('');
  const [page, setPage] = useState(1);
  const size = 10;

  const amount = custom ? Math.floor(Number(custom)) || 0 : preset ?? 0;
  const valid = amount >= MIN && amount <= MAX;

  // Демо-монеты: существующая серверная функция claim_topup (сумма и пауза задаются в админке).
  const s = me?.settings;
  const last = me?.user.last_topup_at ? new Date(me.user.last_topup_at).getTime() : null;
  const readyAt = last && s ? last + s.topup_cooldown_seconds * 1000 : null;
  const left = useCountdown(readyAt);
  const demoOff = !s || s.topup_amount <= 0;
  const claim = useAction(() => api<{ balance: number; amount: number }>('/api/topup', { method: 'POST', body: {} }), {
    onSuccess: (r) => { setBalance(r.balance); haptic.notify('success'); toast.success(`+${fmt(r.amount)} демо-монет`); void refetchMe(); },
  });

  const hist = useQuery({
    queryKey: ['history', 'balance', page],
    queryFn: () => api<{ rows: Tx[]; total: number }>(`/api/history?type=balance&page=${page}&size=${size}`),
    placeholderData: (p) => p,
  });

  const hint = useMemo(() => {
    if (!custom) return null;
    if (amount < MIN) return `Минимум ${fmt(MIN)}`;
    if (amount > MAX) return `Максимум ${fmt(MAX)}`;
    return null;
  }, [custom, amount]);

  return (
    <>
      <Link href="/profile" className="mb-3 inline-flex items-center gap-1 text-sm text-white/50 hover:text-white"><IconBack size={18} />Профиль</Link>
      <PageTitle title="Пополнить баланс" />

      {/* Баланс */}
      <section className="relative overflow-hidden rounded-3xl border border-white/10 p-5" style={{ background: 'radial-gradient(80% 120% at 100% 0%, rgba(198,244,50,.14), transparent 60%), linear-gradient(160deg,#181b20,#0f1013)' }}>
        <p className="text-[12px] text-white/45">Текущий баланс</p>
        <div className="mt-1 flex items-center gap-2.5">
          <Coin size={30} />
          <span className="h-display accent-text text-[40px] leading-none tabular-nums">{fmt(me?.user.balance ?? 0)}</span>
        </div>
      </section>

      {/* Демо-монеты */}
      <section className="panel mt-4 flex items-center gap-4 p-4">
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold text-white">Демо-монеты</p>
          <p className="mt-0.5 text-[12px] leading-snug text-white/45">
            {demoOff ? 'Выдача демо-монет сейчас отключена.' : left > 0 ? `Следующая выдача через ${mmss(left)}` : `Бесплатно, +${fmt(s?.topup_amount ?? 0)} виртуальных монет`}
          </p>
        </div>
        <Button size="md" variant="dark" loading={claim.isPending} disabled={demoOff || left > 0 || !me} onClick={() => claim.mutate(undefined)}>
          {left > 0 ? mmss(left) : `Получить +${fmt(s?.topup_amount ?? 0)}`}
        </Button>
      </section>

      {/* Выбор суммы */}
      <h2 className="h-display mb-3 mt-8 text-[20px] text-white">Сумма пополнения</h2>
      <div className="grid grid-cols-2 gap-2.5 min-[420px]:grid-cols-3">
        {PRESETS.map((v, i) => {
          const on = !custom && preset === v;
          return (
            <motion.button
              key={v} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              onClick={() => { setPreset(v); setCustom(''); haptic.select(); }}
              aria-pressed={on}
              className={cn('relative flex flex-col items-start rounded-2xl border p-3.5 text-left transition active:scale-[0.97]', on ? 'border-lime-400 bg-lime-400/10 shadow-pop' : 'border-white/10 bg-surface hover:border-white/25')}
            >
              <Coin size={20} />
              <span className="mt-2 text-[20px] font-semibold tabular-nums text-white">{fmt(v)}</span>
              <span className="text-[11px] text-white/40">монет</span>
              {on && <span className="absolute right-3 top-3 h-2.5 w-2.5 rounded-full bg-lime-400" />}
            </motion.button>
          );
        })}
      </div>

      <div className="mt-3">
        <label htmlFor="custom-amount" className="mb-1.5 block text-[12px] text-white/45">Своя сумма</label>
        <div className="relative">
          <input
            id="custom-amount" className={cn('input pr-20', hint && 'border-rarity-mythic/60')} inputMode="numeric" placeholder={`от ${fmt(MIN)} до ${fmt(MAX)}`} value={custom}
            onChange={(e) => { setCustom(e.target.value.replace(/\D/g, '').slice(0, 7)); }}
          />
          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[13px] text-white/35">монет</span>
        </div>
        {hint && <p className="mt-1.5 text-[12px] text-rarity-mythic">{hint}</p>}
      </div>

      {/* Итог + продолжить */}
      <section className="panel mt-4 p-4">
        <div className="flex items-center justify-between">
          <span className="text-[13px] text-white/50">Вы выбрали</span>
          <Money value={valid ? amount : 0} size={18} className="text-[20px] text-white" />
        </div>
        <Button size="lg" full className="mt-3" disabled={!valid} onClick={() => { haptic.notify('warning'); toast.info('Функция пока недоступна', 'Оплата ещё не подключена — баланс не изменён'); }}>
          Продолжить
        </Button>
        <p className="mt-3 flex items-start gap-2 text-[12px] leading-snug text-white/40">
          <span className="mt-0.5 text-white/30"><IconLock size={14} /></span>
          Пополнение за оплату пока недоступно: кнопка ничего не списывает и ничего не начисляет.
        </p>
      </section>

      {/* История */}
      <h2 className="h-display mb-3 mt-8 text-[20px] text-white">История операций</h2>
      {hist.isError ? <ErrorState onRetry={() => hist.refetch()} /> : hist.isLoading ? <Skeleton className="h-48" /> : !hist.data?.rows.length ? (
        <p className="panel px-5 py-8 text-center text-sm text-white/40">Операций пока нет.</p>
      ) : (
        <ul className="panel divide-y divide-white/5 overflow-hidden">
          {hist.data.rows.map((t) => (
            <li key={t.id} className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] text-white">{TX_LABEL[t.type] ?? t.type}</p>
                <p className="text-[11px] text-white/35">{fmtDate(t.created_at)} · баланс {fmt(t.balance_after)}</p>
              </div>
              <div className="text-right">
                <Money value={Number(t.amount)} signed size={12} className={cn('text-[14px]', Number(t.amount) > 0 ? 'text-lime-300' : 'text-white/70')} />
                <span className="mt-0.5 inline-block rounded-full bg-lime-400/10 px-2 py-px text-[10px] font-medium text-lime-300">Успешно</span>
              </div>
            </li>
          ))}
        </ul>
      )}
      <Pagination page={page} total={hist.data?.total ?? 0} size={size} onChange={setPage} />
    </>
  );
}
