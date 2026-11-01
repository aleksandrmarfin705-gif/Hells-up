'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, newKey } from '@/lib/client/api';
import { useAction, useMe, useSetBalance } from '@/lib/client/hooks';
import { useRealtimeTable } from '@/lib/client/realtime';
import { haptic } from '@/lib/client/telegram';
import { toast } from '@/lib/client/store';
import { RouletteWheel, angleFor } from '@/components/game/RouletteWheel';
import { Button, ErrorState, Money, Segmented, Skeleton } from '@/components/ui/ui';
import { BET_LABELS, BET_MULTIPLIER, colorOf, roulettePayout, type BetType } from '@/lib/game/roulette';
import { fmtDate } from '@/lib/format';
import { cn } from '@/lib/cn';
import { useCountdown } from '@/lib/client/hooks';

type Round = { id: string; round_no: number; status: 'betting' | 'settled'; server_seed_hash: string; ends_at: string; starts_at: string };
type Bet = { id: string; display_name: string; bet_type: BetType; bet_value: number | null; amount: number; payout: number | null; mine: boolean };
type Last = { id: string; round_no: number; result: number; result_color: 'red' | 'black' | 'green'; server_seed_hash: string; revealed_seed: string | null };
type State = { serverTime: number; round: Round; bets: Bet[]; last: Last[] };
type MyBet = { id: string; bet_type: BetType; bet_value: number | null; amount: number; payout: number | null; created_at: string; round: { round_no: number; result: number | null; result_color: string | null; status: string } | null };

const CHIPS = [10, 50, 100, 500, 1000, 5000];
const COLORS = { red: 'bg-[#9d1c2e]', black: 'bg-[#16161a] ring-1 ring-white/10', green: 'bg-[#16794a]' };
const OUTSIDE: BetType[] = ['red', 'black', 'even', 'odd', 'low', 'high', 'dozen1', 'dozen2', 'dozen3'];
const betTitle = (b: { bet_type: BetType; bet_value: number | null }) => (b.bet_type === 'number' ? `Число ${b.bet_value}` : BET_LABELS[b.bet_type]);

export default function RoulettePage() {
  const qc = useQueryClient();
  const { data: me } = useMe();
  const setBalance = useSetBalance();
  const [tab, setTab] = useState<'table' | 'mine'>('table');
  const [chip, setChip] = useState(100);
  const [custom, setCustom] = useState('');

  const state = useQuery({ queryKey: ['roulette'], queryFn: () => api<State>('/api/roulette/state'), refetchInterval: 1500, refetchIntervalInBackground: false });
  const mine = useQuery({ queryKey: ['roulette-mine'], queryFn: () => api<{ mine: MyBet[] }>('/api/roulette/history'), enabled: tab === 'mine' });
  const refresh = () => qc.invalidateQueries({ queryKey: ['roulette'] });
  useRealtimeTable('roulette_rounds', refresh);
  useRealtimeTable('roulette_bets', refresh);

  const s = state.data;
  const offset = s ? s.serverTime - Date.now() : 0;
  const left = useCountdown(s ? new Date(s.round.ends_at).getTime() : null, offset);
  const total = s ? new Date(s.round.ends_at).getTime() - new Date(s.round.starts_at).getTime() : 30000;

  // --- колесо: крутим при появлении нового результата ---
  const [angle, setAngle] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const seenRound = useRef<number | null>(null);
  const myBetsByRound = useRef<Record<string, Bet[]>>({});
  const lastShown = s?.last[0];

  useEffect(() => {
    if (!s) return;
    myBetsByRound.current[s.round.id] = s.bets.filter((b) => b.mine);
  }, [s]);

  useEffect(() => {
    if (!lastShown) return;
    if (seenRound.current === null) { seenRound.current = lastShown.round_no; setAngle(angleFor(lastShown.result)); return; }
    if (lastShown.round_no === seenRound.current) return;
    seenRound.current = lastShown.round_no;
    setSpinning(true);
    setAngle((a) => Math.floor(a / 360) * 360 - 360 * 6 + angleFor(lastShown.result));
    const t = setTimeout(() => {
      setSpinning(false);
      qc.invalidateQueries({ queryKey: ['me'] });
      const mineBets = myBetsByRound.current[lastShown.id] ?? [];
      if (mineBets.length) {
        const stake = mineBets.reduce((x, b) => x + b.amount, 0);
        const won = mineBets.reduce((x, b) => x + roulettePayout(b.bet_type, b.bet_value, b.amount, lastShown.result), 0);
        if (won > 0) { haptic.notify('success'); toast.success(`Раунд №${lastShown.round_no}: выпало ${lastShown.result}`, `Выплата ${won} · ставка ${stake}`); }
        else { haptic.notify('warning'); toast.info(`Раунд №${lastShown.round_no}: выпало ${lastShown.result}`, `Ставка ${stake} не сыграла`); }
      }
    }, 6200);
    return () => clearTimeout(t);
  }, [lastShown, qc]);

  const amount = custom ? Math.floor(Number(custom)) || 0 : chip;
  const bet = useAction(
    (v: { type: BetType; value?: number }) => api<{ balance: number }>('/api/roulette/bet', { body: { roundId: s!.round.id, type: v.type, value: v.value, amount, key: newKey() } }),
    { onSuccess: (r) => { setBalance(r.balance); haptic.impact('medium'); refresh(); } },
  );
  const closed = !s || left <= 0 || me?.settings.roulette_enabled === false;
  const place = (type: BetType, value?: number) => {
    if (closed) return toast.info('Приём ставок закрыт', 'Дождитесь следующего раунда');
    if (amount < (me?.settings.roulette_min_bet ?? 1) || amount > (me?.settings.roulette_max_bet ?? 1e9)) return toast.error('Некорректная сумма', `Допустимо ${me?.settings.roulette_min_bet}–${me?.settings.roulette_max_bet}`);
    bet.mutate({ type, value });
  };

  const myBets = useMemo(() => (s?.bets ?? []).filter((b) => b.mine), [s]);
  const myStakeOn = (type: BetType, value?: number) => myBets.filter((b) => b.bet_type === type && (type !== 'number' || b.bet_value === value)).reduce((x, b) => x + b.amount, 0);

  if (state.isError && !s) return <ErrorState message="Не удалось подключиться к столу" onRetry={() => state.refetch()} />;

  const secs = Math.ceil(left / 1000);
  return (
    <>
      <div className="mb-4 flex items-end justify-between">
        <div><p className="eyebrow mb-1">Общий стол · демо</p><h1 className="h-display text-[28px] leading-none text-white">Рулетка</h1></div>
        {s && <div className="text-right"><p className="text-[11px] uppercase tracking-widest text-white/40">Раунд</p><p className="h-display accent-text text-3xl leading-none">№{s.round.round_no}</p></div>}
      </div>

      {!s ? <Skeleton className="h-96" /> : (
        <>
          <section className="panel relative overflow-hidden px-3 pb-5 pt-6">
            <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(60% 50% at 50% 38%, rgba(198,244,50,.12), transparent 70%)' }} />
            <div className="relative mx-auto flex w-fit"><RouletteWheel angle={angle} spinning={spinning} size={Math.min(300, typeof window !== 'undefined' ? window.innerWidth - 70 : 280)} /></div>
            <div className="relative mt-5 px-2">
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <span className="text-white/45">{closed ? 'Ставки закрыты' : 'Приём ставок'}</span>
                <span className={cn('font-semibold tabular-nums', secs <= 5 ? 'text-rarity-mythic' : 'text-lime-200')}>{closed ? 'вращение…' : `${secs} с`}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-[linear-gradient(90deg,#6f9a12,#e4fb8c)] transition-[width] duration-200" style={{ width: `${Math.max(0, Math.min(100, (left / total) * 100))}%` }} /></div>
            </div>
            <div className="relative mt-4 flex items-center justify-center gap-1.5">
              {s.last.slice(0, 12).map((l) => (
                <span key={l.id} className={cn('flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold text-white', COLORS[l.result_color])}>{l.result}</span>
              ))}
            </div>
            <p className="relative mt-3 break-all px-2 text-center text-[10px] text-white/25">hash раунда: {s.round.server_seed_hash}</p>
          </section>

          <Segmented className="mt-5" value={tab} onChange={setTab} options={[{ value: 'table', label: 'Стол' }, { value: 'mine', label: 'Мои ставки' }]} />

          {tab === 'table' ? (
            <>
              <div className="mt-4">
                <div className="scroll-x">
                  {CHIPS.map((c) => (
                    <button key={c} onClick={() => { setChip(c); setCustom(''); haptic.select(); }}
                      className={cn('flex h-12 min-w-[3.4rem] items-center justify-center rounded-full border-2 px-3 text-sm font-bold tabular-nums transition active:scale-90', !custom && chip === c ? 'border-lime-300 bg-lime-400/20 text-lime-100 shadow-[0_0_18px_-2px_rgba(198,244,50,.6)]' : 'border-white/15 text-white/60')}>{c}</button>
                  ))}
                  <input inputMode="numeric" placeholder="Своя" value={custom} onChange={(e) => setCustom(e.target.value.replace(/\D/g, '').slice(0, 9))}
                    className="h-12 w-24 flex-none rounded-full border-2 border-white/15 bg-transparent px-4 text-center text-[16px] font-bold text-white outline-none focus:border-lime-400" />
                </div>
                <p className="mt-2 text-xs text-white/35">Ставка: <Money value={amount} size={12} className="text-lime-200" /> · нажмите на поле, чтобы поставить · лимит {me?.settings.roulette_min_bet}–{me?.settings.roulette_max_bet}</p>
              </div>

              <div className="mt-4 grid grid-cols-6 gap-1.5">
                <NumCell n={0} stake={myStakeOn('number', 0)} onClick={() => place('number', 0)} wide />
                {Array.from({ length: 36 }, (_, i) => i + 1).map((n) => <NumCell key={n} n={n} stake={myStakeOn('number', n)} onClick={() => place('number', n)} />)}
              </div>
              <div className="mt-2 grid grid-cols-3 gap-1.5">
                {OUTSIDE.map((t) => (
                  <button key={t} onClick={() => place(t)} className={cn('relative rounded-xl border border-white/10 py-3 text-[13px] font-semibold text-white transition active:scale-95', t === 'red' ? 'bg-[#9d1c2e]/80' : t === 'black' ? 'bg-[#16161a]' : 'bg-surface-2')}>
                    {BET_LABELS[t]}<span className="block text-[10px] font-normal text-white/45">×{BET_MULTIPLIER[t]}</span>
                    {myStakeOn(t) > 0 && <Stake v={myStakeOn(t)} />}
                  </button>
                ))}
              </div>

              <h2 className="h-display mb-2 mt-7 text-2xl text-white">Участники раунда <span className="text-base text-white/35">({new Set(s.bets.map((b) => b.display_name)).size})</span></h2>
              {!s.bets.length ? <p className="panel px-5 py-6 text-center text-sm text-white/40">Ставок пока нет — станьте первым.</p> : (
                <ul className="panel max-h-72 divide-y divide-white/5 overflow-y-auto">
                  {s.bets.map((b) => (
                    <li key={b.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                      <span className={cn('truncate', b.mine ? 'font-semibold text-lime-200' : 'text-white/70')}>{b.mine ? 'Вы' : b.display_name}</span>
                      <span className="flex-1 truncate text-right text-white/45">{betTitle(b)}</span>
                      <Money value={b.amount} size={12} className="w-20 justify-end text-lime-200/90" />
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <div className="mt-4">
              {mine.isLoading ? <Skeleton className="h-40" /> : !mine.data?.mine.length ? <p className="panel px-5 py-8 text-center text-sm text-white/40">Вы ещё не делали ставок.</p> : (
                <ul className="panel divide-y divide-white/5 overflow-hidden">
                  {mine.data.mine.map((b) => (
                    <li key={b.id} className="flex items-center gap-3 px-4 py-3">
                      <span className={cn('flex h-9 w-9 flex-none items-center justify-center rounded-full text-xs font-bold text-white', b.round?.result_color ? COLORS[b.round.result_color as 'red'] : 'bg-surface-3')}>{b.round?.result ?? '…'}</span>
                      <div className="min-w-0 flex-1"><p className="truncate text-sm text-white">{betTitle(b)} · <Money value={b.amount} size={12} /></p><p className="text-xs text-white/35">Раунд №{b.round?.round_no} · {fmtDate(b.created_at)}</p></div>
                      <span className={cn('text-sm font-semibold tabular-nums', b.payout == null ? 'text-white/40' : b.payout > 0 ? 'text-emerald-400' : 'text-white/35')}>{b.payout == null ? 'ждём' : b.payout > 0 ? `+${b.payout - b.amount}` : `−${b.amount}`}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          <Button variant="ghost" size="sm" className="mx-auto mt-6 flex" onClick={() => setTab('mine')}>История моих ставок</Button>
          <p className="mt-2 text-center text-[11px] leading-relaxed text-white/30">Результат — число 0–36 из HMAC-SHA256(server seed, id раунда). Seed раскрывается после раунда.</p>
        </>
      )}
    </>
  );
}

function Stake({ v }: { v: number }) {
  return <span className="absolute -right-1 -top-1.5 rounded-full bg-lime-300 px-1.5 text-[10px] font-bold leading-4 text-[#0d1403] shadow">{v >= 1000 ? `${Math.round(v / 100) / 10}k` : v}</span>;
}

function NumCell({ n, onClick, stake, wide }: { n: number; onClick: () => void; stake: number; wide?: boolean }) {
  return (
    <button onClick={onClick} className={cn('relative rounded-lg py-2.5 text-sm font-bold text-white transition active:scale-90', COLORS[colorOf(n)], wide && 'col-span-6')}>
      {n}{stake > 0 && <Stake v={stake} />}
    </button>
  );
}
