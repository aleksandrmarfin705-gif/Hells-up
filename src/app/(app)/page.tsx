'use client';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { api } from '@/lib/client/api';
import { useMe } from '@/lib/client/hooks';
import { useRealtimeTable } from '@/lib/client/realtime';
import { CaseCard, ItemCard } from '@/components/game/Cards';
import { EventFeed } from '@/components/game/EventFeed';
import { Button, ErrorState, Skeleton } from '@/components/ui/ui';
import { LogoMark } from '@/components/brand/Logo';
import { IconChevron, IconHistory, IconInventory, IconSparkle, IconSupport } from '@/components/brand/Icons';
import { displayName } from '@/lib/format';
import type { CaseSummary, GameEvent, Item } from '@/lib/types';

type Home = { popular: CaseSummary[]; newest: CaseSummary[]; rareItems: Item[]; events: GameEvent[] };

function Section({ title, eyebrow, href, children }: { title: string; eyebrow?: string; href?: string; children: React.ReactNode }) {
  return (
    <section className="mt-9">
      <div className="mb-3.5 flex items-end justify-between">
        <div>
          {eyebrow && <p className="eyebrow mb-1">{eyebrow}</p>}
          <h2 className="h-display text-[28px] leading-none text-white">{title}</h2>
        </div>
        {href && <Link href={href} className="flex items-center gap-0.5 text-[13px] text-gold-300/80 hover:text-gold-200">Все <IconChevron size={16} /></Link>}
      </div>
      {children}
    </section>
  );
}

export default function HomePage() {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const home = useQuery({ queryKey: ['home'], queryFn: () => api<Home>('/api/home'), refetchInterval: 20_000 });
  useRealtimeTable('game_events', () => qc.invalidateQueries({ queryKey: ['home'] }));

  const s = me?.settings;
  return (
    <>
      {/* Hero */}
      <motion.section
        initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6 }}
        className="noise relative overflow-hidden rounded-[1.75rem] border border-gold-400/25 p-6 md:p-10"
        style={{ background: 'radial-gradient(120% 120% at 100% 0%, rgba(212,175,55,.22), transparent 55%), radial-gradient(90% 90% at 0% 100%, rgba(226,85,43,.16), transparent 60%), linear-gradient(160deg,#121214,#060607)' }}
      >
        <div className="pointer-events-none absolute -right-8 -top-8 opacity-[0.12] md:right-6 md:top-4 md:opacity-30"><LogoMark size={220} className="animate-floaty" /></div>
        <p className="eyebrow">{me ? `Добро пожаловать, ${displayName(me.user)}` : 'Добро пожаловать'}</p>
        <h1 className="h-display gold-text mt-3 max-w-md text-[44px] leading-[0.95] md:text-6xl">{s?.banner_title ?? 'Поднимись из пепла'}</h1>
        <p className="mt-3 max-w-sm text-[15px] leading-relaxed text-white/60">{s?.banner_subtitle}</p>
        <div className="relative mt-6 flex flex-wrap gap-3">
          <Link href="/cases"><Button size="lg">Открыть кейсы</Button></Link>
          <Link href="/games"><Button size="lg" variant="dark">Играть</Button></Link>
        </div>
        <p className="mt-5 text-[11px] uppercase tracking-[0.2em] text-white/30">Демо · только виртуальные монеты</p>
      </motion.section>

      {/* Quick links */}
      <div className="mt-4 grid grid-cols-4 gap-2.5">
        {[
          { href: '/inventory', label: 'Инвентарь', Icon: IconInventory },
          { href: '/history', label: 'История', Icon: IconHistory },
          { href: '/support', label: 'Поддержка', Icon: IconSupport },
          { href: '/fair', label: 'Честность', Icon: IconSparkle },
        ].map(({ href, label, Icon }) => (
          <Link key={href} href={href} className="panel panel-hover flex flex-col items-center gap-1.5 py-3.5 text-[11px] font-medium text-white/70">
            <span className="text-gold-300"><Icon size={22} /></span>{label}
          </Link>
        ))}
      </div>

      {home.isError ? (
        <div className="mt-8"><ErrorState message="Не удалось загрузить каталог" onRetry={() => home.refetch()} /></div>
      ) : (
        <>
          <Section title="Популярные кейсы" eyebrow="Выбор игроков" href="/cases">
            {home.isLoading ? <CaseSkeletons /> : (
              <div className="scroll-x md:grid md:grid-cols-4 md:overflow-visible md:[margin-inline:0] md:[padding-inline:0]">
                {home.data?.popular.map((c, i) => <CaseCard key={c.id} c={c} index={i} className="w-[168px] md:w-auto" />)}
              </div>
            )}
          </Section>

          <Section title="Новые кейсы" eyebrow="Свежие поступления" href="/cases">
            {home.isLoading ? <CaseSkeletons /> : (
              <div className="scroll-x md:grid md:grid-cols-4 md:overflow-visible md:[margin-inline:0] md:[padding-inline:0]">
                {home.data?.newest.map((c, i) => <CaseCard key={c.id} c={c} index={i} className="w-[168px] md:w-auto" />)}
              </div>
            )}
          </Section>

          <Section title="Редкие предметы" eyebrow="Что можно получить">
            {home.isLoading ? <div className="scroll-x">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-44 w-36" />)}</div> : (
              <div className="scroll-x">
                {home.data?.rareItems.map((it) => <ItemCard key={it.id} item={it} className="w-36" />)}
              </div>
            )}
          </Section>

          <Section title="Последние события" eyebrow="Прямой эфир">
            {home.isLoading ? <Skeleton className="h-56 w-full" /> : <EventFeed events={home.data?.events ?? []} />}
          </Section>
        </>
      )}
    </>
  );
}

function CaseSkeletons() {
  return <div className="scroll-x md:grid md:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-60 w-[168px] md:w-auto" />)}</div>;
}
