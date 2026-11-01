'use client';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/client/api';
import { useMe } from '@/lib/client/hooks';
import { Skeleton, Stat, Money, PageTitle } from '@/components/ui/ui';
import { IconChevron, IconHistory, IconInventory, IconShield, IconSparkle, IconSupport } from '@/components/brand/Icons';
import { displayName, fmt, fmtDay } from '@/lib/format';

type Stats = {
  cases_opened: number; items_owned: number; inventory_value: number; upgrades_total: number; upgrades_won: number;
  roulette_bets: number; roulette_wins: number; blackjack_games: number; blackjack_wins: number; total_spent: number; total_won: number;
};

export default function ProfilePage() {
  const { data: me } = useMe();
  const st = useQuery({ queryKey: ['profile'], queryFn: () => api<{ stats: Stats }>('/api/profile') });
  const u = me?.user;
  const s = st.data?.stats;
  const wins = s ? s.upgrades_won + s.roulette_wins + s.blackjack_wins : 0;
  const name = u ? displayName(u) : '';

  const links = [
    { href: '/inventory', label: 'Инвентарь', Icon: IconInventory },
    { href: '/history', label: 'История', Icon: IconHistory },
    { href: '/support', label: 'Поддержка', Icon: IconSupport },
    { href: '/fair', label: 'Проверка честности', Icon: IconSparkle },
    ...(me?.isAdmin ? [{ href: '/admin', label: 'Админ-панель', Icon: IconShield }] : []),
  ];

  return (
    <>
      <PageTitle eyebrow="Аккаунт" title="Профиль" />
      <section className="panel relative overflow-hidden p-5" style={{ background: 'radial-gradient(80% 100% at 100% 0%, rgba(212,175,55,.14), transparent 60%), linear-gradient(180deg,#141416,#09090a)' }}>
        <div className="flex items-center gap-4">
          {u?.photo_url ? (
            <img src={u.photo_url} alt="" className="h-20 w-20 rounded-full border-2 border-gold-400/50 object-cover" referrerPolicy="no-referrer" />
          ) : (
            <span className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-gold-400/50 bg-surface-3 h-display text-4xl text-gold-200">{name.slice(0, 1).toUpperCase() || 'H'}</span>
          )}
          <div className="min-w-0">
            <p className="h-display truncate text-3xl leading-tight text-white">{name || '…'}</p>
            {u?.username && <p className="text-sm text-gold-300/80">@{u.username}</p>}
            <p className="mt-0.5 text-xs text-white/40">В игре с {fmtDay(u?.created_at)}</p>
          </div>
        </div>
        <div className="mt-5 rounded-2xl border border-gold-400/20 bg-black/40 px-4 py-3.5">
          <p className="text-[11px] uppercase tracking-[0.2em] text-white/40">Виртуальный баланс</p>
          <Money value={u?.balance ?? 0} size={26} className="gold-text mt-1 text-[32px]" />
        </div>
      </section>

      <h2 className="h-display mb-3 mt-8 text-[26px] text-white">Статистика</h2>
      {!s ? <div className="grid grid-cols-2 gap-3">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-20" />)}</div> : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <Stat label="Открыто кейсов" value={fmt(s.cases_opened)} />
          <Stat label="Предметов" value={fmt(s.items_owned)} hint={`на ${fmt(s.inventory_value)} монет`} />
          <Stat label="Побед в играх" value={fmt(wins)} hint="улучшения, рулетка, Blackjack" />
          <Stat label="Улучшения" value={`${s.upgrades_won} / ${s.upgrades_total}`} hint="успешных" />
          <Stat label="Рулетка" value={`${s.roulette_wins} / ${s.roulette_bets}`} hint="выигрышных ставок" />
          <Stat label="Blackjack" value={`${s.blackjack_wins} / ${s.blackjack_games}`} hint="побед" />
          <Stat label="Потрачено" value={<Money value={s.total_spent} size={14} />} />
          <Stat label="Получено" value={<Money value={s.total_won} size={14} />} hint="выплаты и продажи" />
        </div>
      )}

      <h2 className="h-display mb-3 mt-8 text-[26px] text-white">Разделы</h2>
      <ul className="panel divide-y divide-white/5 overflow-hidden">
        {links.map(({ href, label, Icon }) => (
          <li key={href}><Link href={href} className="flex items-center gap-3 px-4 py-4 text-[15px] text-white/85 transition hover:bg-white/5"><span className="text-gold-300"><Icon size={22} /></span><span className="flex-1">{label}</span><IconChevron size={18} className="text-white/30" /></Link></li>
        ))}
      </ul>
      <p className="mt-6 text-center text-[11px] leading-relaxed text-white/30">HELLS UP — демо-приложение. Монеты и предметы виртуальные, вывод и обмен невозможны.</p>
    </>
  );
}
