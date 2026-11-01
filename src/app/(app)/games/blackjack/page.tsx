'use client';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { api, newKey } from '@/lib/client/api';
import { useAction, useMe, useSetBalance } from '@/lib/client/hooks';
import { haptic } from '@/lib/client/telegram';
import { PlayingCard } from '@/components/game/PlayingCard';
import { Button, ErrorState, Money, Skeleton } from '@/components/ui/ui';
import { fmtDate } from '@/lib/format';
import { cn } from '@/lib/cn';

type Game = {
  id: string; bet: number; status: 'active' | 'finished'; outcome: 'win' | 'lose' | 'push' | 'blackjack' | null; payout: number | null; version: number;
  view: { player: number[]; dealer: number[]; dealerHidden: boolean; playerTotal: number; dealerTotal: number | null; canDouble: boolean };
  balance?: number; fair: { server_seed_hash: string | null; client_seed: string | null; nonce: number | null };
};
type Recent = { id: string; bet: number; outcome: Game['outcome']; payout: number; created_at: string };

const CHIPS = [10, 50, 100, 500, 1000, 5000];
const OUTCOME = {
  win: { title: 'Победа!', color: 'text-emerald-400', glow: '#34d39966' },
  blackjack: { title: 'BLACKJACK 3:2', color: 'accent-text', glow: '#c6f43299' },
  push: { title: 'Ничья', color: 'text-white', glow: '#ffffff33' },
  lose: { title: 'Поражение', color: 'text-rarity-mythic', glow: '#ff456044' },
} as const;

export default function BlackjackPage() {
  const qc = useQueryClient();
  const { data: me } = useMe();
  const setBalance = useSetBalance();
  const q = useQuery({ queryKey: ['blackjack'], queryFn: () => api<{ game: Game | null; recent: Recent[] }>('/api/blackjack') });
  const [bet, setBet] = useState(100);
  const [custom, setCustom] = useState('');
  const [game, setGame] = useState<Game | null | undefined>(undefined);
  const g = game === undefined ? q.data?.game ?? null : game;
  const amount = custom ? Math.floor(Number(custom)) || 0 : bet;

  const sync = (next: Game) => {
    setGame(next);
    if (next.balance !== undefined) setBalance(next.balance);
    if (next.status === 'finished') {
      haptic.notify(next.outcome === 'lose' ? 'error' : next.outcome === 'push' ? 'warning' : 'success');
      qc.invalidateQueries({ queryKey: ['blackjack'] });
      qc.invalidateQueries({ queryKey: ['me'] });
    }
  };
  const start = useAction((b: number) => api<{ game: Game }>('/api/blackjack/start', { body: { bet: b, key: newKey() } }), { onSuccess: (r) => sync(r.game) });
  const act = useAction((a: 'hit' | 'stand' | 'double') => api<{ game: Game }>('/api/blackjack/action', { body: { gameId: g!.id, version: g!.version, action: a } }), {
    onSuccess: (r) => sync(r.game),
    silent: false,
  });

  if (q.isError) return <ErrorState onRetry={() => q.refetch()} />;
  const enabled = me?.settings.blackjack_enabled !== false;
  const busy = start.isPending || act.isPending;
  const finished = g?.status === 'finished';
  const oc = finished && g?.outcome ? OUTCOME[g.outcome] : null;

  return (
    <>
      <div className="mb-4"><p className="eyebrow mb-1">Против дилера · демо</p><h1 className="h-display text-[28px] leading-none text-white">Blackjack</h1></div>
      {q.isLoading ? <Skeleton className="h-96" /> : (
        <section className="relative overflow-hidden rounded-3xl border border-white/10 px-4 py-6" style={{ background: 'radial-gradient(90% 70% at 50% 0%, #17352a 0%, #0d1713 55%, #0b0c0e 100%)' }}>
          <div className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-inset ring-white/10" />
          {!g ? (
            <div className="relative py-4 text-center">
              <p className="h-display text-3xl text-white">Сделайте ставку</p>
              <p className="mx-auto mt-1 max-w-xs text-sm text-white/50">Дилер берёт до 17. Блэкджек платит 3:2, ничья возвращает ставку.</p>
              <div className="scroll-x mt-6 justify-center">
                {CHIPS.map((c) => (
                  <button key={c} onClick={() => { setBet(c); setCustom(''); haptic.select(); }}
                    className={cn('flex h-12 min-w-[3.4rem] items-center justify-center rounded-full border-2 px-3 text-sm font-bold tabular-nums transition active:scale-90', !custom && bet === c ? 'border-lime-300 bg-lime-400/20 text-lime-100' : 'border-white/15 text-white/60')}>{c}</button>
                ))}
              </div>
              <input inputMode="numeric" placeholder="Своя сумма" value={custom} onChange={(e) => setCustom(e.target.value.replace(/\D/g, '').slice(0, 9))}
                className="mx-auto mt-3 block h-12 w-44 rounded-full border-2 border-white/15 bg-black/30 px-4 text-center text-[16px] font-bold text-white outline-none focus:border-lime-400" />
              <p className="mt-2 text-xs text-white/35">Лимит {me?.settings.blackjack_min_bet}–{me?.settings.blackjack_max_bet}</p>
              <Button size="lg" className="mt-5 min-w-[220px]" loading={start.isPending} disabled={!enabled || amount < 1 || amount > (me?.user.balance ?? 0)} onClick={() => start.mutate(amount)}>
                {!enabled ? 'Режим отключён' : amount > (me?.user.balance ?? 0) ? 'Недостаточно монет' : <>Раздать · <Money value={amount} className="text-[#0d1403]" /></>}
              </Button>
            </div>
          ) : (
            <div className="relative">
              <Hand label="Дилер" total={g.view.dealerHidden ? null : g.view.dealerTotal} cards={g.view.dealer} hiddenExtra={g.view.dealerHidden} />
              <div className="my-5 flex items-center justify-center">
                <AnimatePresence mode="wait">
                  {oc ? (
                    <motion.div key="res" initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 16 }} className="text-center" style={{ filter: `drop-shadow(0 0 18px ${oc.glow})` }}>
                      <p className={cn('h-display text-4xl', oc.color)}>{oc.title}</p>
                      <p className="mt-0.5 text-sm text-white/60">{g.payout && g.payout > 0 ? <>Выплата <Money value={g.payout} className="text-lime-200" /></> : <>Ставка <Money value={g.bet} /> проиграна</>}</p>
                    </motion.div>
                  ) : (
                    <motion.p key="bet" className="rounded-full border border-lime-400/30 bg-black/40 px-4 py-1.5 text-sm text-white/70" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>Ставка <Money value={g.bet} className="text-lime-200" /></motion.p>
                  )}
                </AnimatePresence>
              </div>
              <Hand label="Вы" total={g.view.playerTotal} cards={g.view.player} />

              {finished ? (
                <div className="mt-6 grid gap-2.5">
                  <Button size="lg" loading={start.isPending} disabled={g.bet > (me?.user.balance ?? 0)} onClick={() => start.mutate(g.bet)}>Ещё раз · <Money value={g.bet} className="text-[#0d1403]" /></Button>
                  <Button variant="dark" onClick={() => { setGame(null); }}>Изменить ставку</Button>
                </div>
              ) : (
                <div className="mt-6 grid grid-cols-3 gap-2.5">
                  <Button variant="dark" size="lg" disabled={busy} onClick={() => act.mutate('hit')}>Hit</Button>
                  <Button size="lg" disabled={busy} onClick={() => act.mutate('stand')}>Stand</Button>
                  <Button variant="dark" size="lg" disabled={busy || !g.view.canDouble || (me?.user.balance ?? 0) < g.bet} onClick={() => act.mutate('double')}>Double</Button>
                </div>
              )}
              <p className="mt-4 break-all text-center text-[10px] text-white/25">hash {g.fair.server_seed_hash?.slice(0, 20)}… · nonce {g.fair.nonce}</p>
            </div>
          )}
        </section>
      )}

      <h2 className="h-display mb-3 mt-8 text-[20px] text-white">Последние партии</h2>
      {!q.data?.recent.length ? <p className="panel px-5 py-6 text-center text-sm text-white/40">Партий пока нет.</p> : (
        <ul className="panel divide-y divide-white/5 overflow-hidden">
          {q.data.recent.map((r) => (
            <li key={r.id} className="flex items-center justify-between px-4 py-3 text-sm">
              <span className="text-white/60">{fmtDate(r.created_at)}</span>
              <Money value={r.bet} size={12} className="text-white/70" />
              <span className={cn('w-20 text-right font-semibold', r.outcome === 'lose' ? 'text-rarity-mythic' : r.outcome === 'push' ? 'text-white/60' : 'text-emerald-400')}>{r.outcome ? OUTCOME[r.outcome].title.split(' ')[0] : ''}</span>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-[11px] leading-relaxed text-white/30">Колода перемешивается на сервере (provably fair) и не передаётся в браузер, пока партия идёт.</p>
    </>
  );
}

function Hand({ label, total, cards, hiddenExtra }: { label: string; total: number | null; cards: number[]; hiddenExtra?: boolean }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs uppercase tracking-[0.22em] text-white/40">{label}</span>
        {total !== null && <span className="rounded-full border border-lime-400/30 bg-black/40 px-2.5 py-0.5 text-sm font-semibold tabular-nums text-lime-100">{total}</span>}
      </div>
      <div className="flex min-h-[110px] flex-wrap justify-center gap-2">
        {cards.map((c, i) => <PlayingCard key={`${c}-${i}`} card={c} delay={i * 0.12} />)}
        {hiddenExtra && <PlayingCard hidden delay={0.2} />}
      </div>
    </div>
  );
}
